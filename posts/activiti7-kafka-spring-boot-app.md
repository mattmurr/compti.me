---
title: "Bring BPM into your Spring Boot App for great tempo"
description: "Activiti 7 BPM + Spring Boot + Apache Kafka"
date: "2023-03-21"
---

Starting off by creating a new spring-boot project. I'll be using the Spring
Boot CLI.

Instructions to install, found here:
[Installing Spring Boot CLI](https://docs.spring.io/spring-boot/docs/current/reference/html/getting-started.html#getting-started.installing.cli)

```bash
➜  Repositories spring init activiti-example
Using service at https://start.spring.io
Project extracted to '/Users/matt/Repositories/activiti-example'
➜  Repositories cd activiti-example
➜  activiti-example ls
 build.gradle   gradlew       HELP.md           src
 gradle         gradlew.bat   settings.gradle
```

Let's run the tests to make sure everything is working as expected

```bash
➜  activiti-example ./gradlew test

BUILD SUCCESSFUL in 3s
4 actionable tasks: 2 executed, 2 up-to-date
```

I will be building an API which allows users to sign up. There will then be a
BPMN process which requires a human to approve users, reading from a Kafka
topic.

## API

Starting with the CRUD API, let's add an POST endpoint to create a new user.

Add the following dependencies:

```gradle
dependencies {
	implementation 'org.springframework.boot:spring-boot-starter'
	+ implementation 'org.springframework.boot:spring-boot-starter-web'
	+ implementation 'org.springframework.boot:spring-boot-starter-data-jpa'
	+ implementation 'com.h2database:h2'
	testImplementation 'org.springframework.boot:spring-boot-starter-test'
}
```

Let's start by defining our `UserController` with our POST endpoint to register
a user:

```java
@RestController
@RequestMapping("/user")
@ResponseStatus(HttpStatus.OK)
public class UserController {

	private final UserService userService;

	public UserController(UserService userService) {
		this.userService = userService;
	}

	@PostMapping
	public Long registerUser() {
		return userService.registerUser();
	}

}
```

Our `UserService` is responsible for saving the `UserRecord` which is simply
just going to contain an ID for that specific user, and later we will also be
publishing a message to a Kafka topic, to trigger our BPM:

```java
@Service
public class UserService {

	private final UserRepository userRepository;

	public UserService(UserRepository userRepository) {
		this.userRepository = userRepository;
	}

	public Long registerUser() {
		/*
		 * 1. Save user to DB
		 * 2. Publish user registered notification
		 * 3. Respond OK
		 */

		var user = new UserRecord();
		user = userRepository.save(user);

        return user.getId()
	}
}
```

Finally, we have our `UserRepository` CRUD Repo, and `UserRecord` entity:

```java
public interface UserRepository extends CrudRepository<UserRecord, Long> { }
```

```java
@Entity
public class UserRecord {

	@Id
	@GeneratedValue
	private Long id;

	public Long getId() {
		return id;
	}
}
```

Running the app with `./gradlew bootRun`, Spring should configure and start an
ephemeral H2 database in memory, we should be able to make a POST request to
`http://localhost:8080` and receive a response that is the ID of the created
row.

## Adding Kafka

Following the
["Guide to Setting Up Apache Kafka Using Docker" by Baeldung](https://www.baeldung.com/ops/kafka-docker-setup),
we can use their sample docker-compose configuration, which I add to the root of
my project.

<details>
<summary><code>docker-compose.yml</code></summary>

```yml
version: "2"
services:
  zookeeper:
    image: confluentinc/cp-zookeeper:latest
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
    ports:
      - 22181:2181

  kafka:
    image: confluentinc/cp-kafka:latest
    depends_on:
      - zookeeper
    ports:
      - 29092:29092
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092,PLAINTEXT_HOST://localhost:29092
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT
      KAFKA_INTER_BROKER_LISTENER_NAME: PLAINTEXT
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
```

</details>

This should configure ZooKeeper and Kafka with the bootstrap server listening on
port 29092.

Add the following dependency:

```gradle
dependencies {
  ...
  implementation 'org.springframework.kafka:spring-kafka'
}
```

We need to tell Spring how to use Kafka for both publishing and consuming
messages, this is fairly simple through a `@Configuration` class.

<details>
<summary><code>KafkaConfig</code></summary>

```java
@EnableKafka
@Configuration
public class KafkaConfig {

	public static final String USER_REGISTERED_TOPIC = "userRegisteredTopic";
	public static final String GROUP_ID = "group1";

	@Value(value = "${spring.kafka.bootstrap-servers}")
	private String bootstrapAddress;

	@Bean
	public KafkaAdmin kafkaAdmin() {
		Map<String, Object> configs = new HashMap<>();
		configs.put(AdminClientConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapAddress);
		return new KafkaAdmin(configs);
	}

	@Bean
	public NewTopic userRegisteredTopic() {
		return new NewTopic(USER_REGISTERED_TOPIC, 1, (short) 1);
	}

	@Bean
	public ProducerFactory<String, String> producerFactory() {
		Map<String, Object> configProps = new HashMap<>();
		configProps.put(
				ProducerConfig.BOOTSTRAP_SERVERS_CONFIG,
				bootstrapAddress);
		configProps.put(
				ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG,
				StringSerializer.class);
		configProps.put(
				ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG,
				StringSerializer.class);
		return new DefaultKafkaProducerFactory<>(configProps);
	}

	@Bean
	public KafkaTemplate<String, String> kafkaTemplate() {
		return new KafkaTemplate<>(producerFactory());
	}

	@Bean
	public ConsumerFactory<String, String> consumerFactory() {
		Map<String, Object> props = new HashMap<>();
		props.put(
				ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG,
				bootstrapAddress);
		props.put(
				ConsumerConfig.GROUP_ID_CONFIG,
				GROUP_ID);
		props.put(
				ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG,
				StringDeserializer.class);
		props.put(
				ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG,
				StringDeserializer.class);
		return new DefaultKafkaConsumerFactory<>(props);
	}

	@Bean
	public ConcurrentKafkaListenerContainerFactory<String, String> kafkaListenerContainerFactory() {

		ConcurrentKafkaListenerContainerFactory<String, String> factory = new ConcurrentKafkaListenerContainerFactory<>();
		factory.setConsumerFactory(consumerFactory());
		return factory;
	}
}
```

</details>

Set the `spring.kafka.bootstrap-servers` property in the
`application.properties` or `application.yml` if you prefer YAML style
configuration.

```properties
spring.kafka.bootstrap-servers=http://localhost:29092
```

Spring Boot will pick this up and inject the value into our new Kafka
configuration class.

This configuration will allow sending messages to the Kafka topic, and consuming
them with the `@KafkaListener` annotation, I've added these two methods to the
`UserService`, (calling the notify method right after saving the ID to the
database):

```java
private void notify(Long id) {
    kafkaTemplate.send(KafkaConfig.USER_REGISTERED_TOPIC, id.toString());
}

@KafkaListener(topics = KafkaConfig.USER_REGISTERED_TOPIC, groupId = KafkaConfig.GROUP_ID)
public void listen(String msg) {
    System.out.println("Kafka Listener received msg: " + msg);
}
```

Running the app again with `./gradlew bootRun`, we should be able to hit our
register endpoint, our message will be published and consumed asynchronously,
and we will see the logging:

```shell
Kafka Listener received msg: 1
```

[Click here for Part 2](/posts/activiti7-kafka-spring-boot-app-part-2), where
BPM processing will be introduced into the app.
