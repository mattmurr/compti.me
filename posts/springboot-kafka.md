---
title: "Spring Boot with Apache Kafka"
description: "Spring Boot + Apache Kafka"
date: "2023-03-21"
---

Apache Kafka is an open-source distributed streaming platform that allows for the real-time processing and analysis of high volumes of data. It uses a publish-subscribe model where data producers publish data to topics, and data consumers subscribe to those topics to receive the data. Kafka's architecture is designed to handle data at scale.

Let's see how easy it is to build a Spring Boot project utilising Kafka.

I'll be creating an API, which allows a user to register. We will then integrate Kafka and publish a message, of which subscribers (our app in this case) can consume our message.

## Setup

I'll use the Spring Boot CLI to create the project, you can find instructions for this at [Installing Spring Boot CLI](https://docs.spring.io/spring-boot/docs/current/reference/html/getting-started.html#getting-started.installing.cli). Alternatively, use [Spring Initialzr](https://start.spring.io/) or your IDE. I've gone with the default settings, Gradle – Groovy, Java 17.

```bash
➜  Repositories spring init spring-kafka-example
Using service at https://start.spring.io
Project extracted to '/Users/matt/Repositories/springboot-kafka-example'
➜  Repositories cd spring-kafka-example
➜  springboot-kafka-example ls
build.gradle  gradlew      HELP.md          src
gradle        gradlew.bat  settings.gradle
```

## The API

Let's add the dependencies:

1. ⁣`spring-boot-starter-web` for the Spring MVC (Read about what that is: [https://developer.mozilla.org/en-US/docs/Glossary/MVC](https://developer.mozilla.org/en-US/docs/Glossary/MVC)) for our RESTful API.
    
2. `spring-boot-starter-data-jpa` to implement a data access layer.
    
3. `h2` is our database driver that we need to communicate with the H2 DB.
    

```bash
dependencies {
	...
	implementation 'org.springframework.boot:spring-boot-starter-web'
	implementation 'org.springframework.boot:spring-boot-starter-data-jpa'
	implementation 'com.h2database:h2'
}
```

### Controller

Once that is done, we can begin defining our `UserController` with a single POST endpoint to register a user:

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

### Service

The `UserService` will be responsible for orchestrating our logic for the User API, for now just a simple method to generate a `UserRecord` DAO, which we will implement shortly.

```java
@Service
public class UserService {

	private final UserRepository userRepository;

	public UserService(UserRepository userRepository) {
		this.userRepository = userRepository;
	}

	public Long registerUser() {
		var user = new UserRecord();
		user = userRepository.save(user);

		return user.getId()
	}
}
```

### CRUD Repository

Finally, we have our `UserRepository`, and the `UserRecord`. `@GeneratedValue` will be used to generate our user's ID in ascending order, (1, 2, 3…).

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

Run the app with `./gradlew bootRun`. Spring should start an in-memory H2 DB, and we will be able to make a POST request to [`http://localhost:8080`](http://localhost:8080) and get back the ID of the new user row in the DB.

## Adding Kafka

### Deploying locally

Read the [“Guide to Setting Up Apache Kafka Using Docker” by Baeldung](https://www.baeldung.com/ops/kafka-docker-setup). You can find a [sample docker-compose configuration](https://www.baeldung.com/ops/kafka-docker-setup#docker-compose-file), which I've added to the root of my project.

Running `docker compose up` should pull the images and deploy, ZooKeeper and Kafka with the bootstrap server listening on port 29092.

### Integrating with Spring

The following dependency allows us to interact with Kafka from the Spring app:

```bash
dependencies {
  ...
  implementation 'org.springframework.kafka:spring-kafka'
}
```

### Topics & Groups

Kafka topics are like channels through which data is published and consumed. They are identified by a name, and data producers publish messages to a specific topic, while data consumers subscribe to a topic to receive those messages.

Kafka groups are logical groups of data consumers that work together to consume data from a topic. Each message in a topic is consumed by only one consumer in a group. This allows multiple instances of the same application (think Microservices) to work together to consume data from a topic, it will be consumed only once.

Our topic will be called `userRegisteredTopic` and our group is `group1`. If we were deploying multiple instances of our app, we would use the same group identifier in each of those, otherwise, we will likely consume the message multiple times. Likewise, if added another app which will do something different with the message, such as for performing analytics, we would use a different group identifier.

### Kafka Configuration

Here we have the `KafkaConfig` class:

```java
@EnableKafka
@Configuration
class KafkaConfig {

	private static final String USER_REGISTERED_TOPIC = "userRegisteredTopic";
	public static final String GROUP_ID = "group1";

	@Value(value = "${spring.kafka.bootstrap-servers}")
	private String bootstrapAddress;

	@Bean
	public NewTopic userRegisteredTopic() {
		return new NewTopic(USER_REGISTERED_TOPIC, 1, (short) 1);
	}
}
```

Set the `spring.kafka.bootstrap-servers` property in the [`application.properties`](http://application.properties), or `application.yml` if you prefer YAML style configuration. Spring Boot will pick this up and inject the value into our new Kafka config class.

```ini
spring.kafka.bootstrap-servers=http://localhost:29092
```

### Kafka usage

We should be able to publish messages and read messages with the `kafkaTemplate` bean and the `@KafkaListener` annotation. I've added these two methods to the `UserService`, (calling the notify method right after saving the user to the database):

```java
private void notify(Long id) {
    kafkaTemplate.send(KafkaConfig.USER_REGISTERED_TOPIC, id.toString());
}

@KafkaListener(topics = KafkaConfig.USER_REGISTERED_TOPIC, groupId = KafkaConfig.GROUP_ID)
public void listen(String msg) {
    System.out.println("Kafka Listener received msg: " + msg);
}
```

Running the app again with `./gradlew bootRun`, we should be able to hit our register endpoint, our message will be published then consumed, and we should see the listener `println` output: `Kafka Listener received msg: 1`.

## Thoughts

This is a very basic way to use Apache Kafka, there is way more to learn:

* [https://kafka.apache.org/](https://kafka.apache.org/)
    
* [https://docs.spring.io/spring-kafka/reference/html/](https://docs.spring.io/spring-kafka/reference/html/)
    

Kafka is a powerful tool for managing large-scale, real-time data pipelines, but it may not be the best solution for a small, lightweight application. A simpler solution that is easier to manage, and requires fewer resources, such as a traditional database or message queue, might be more appropriate.

All code written for this article can be found on my GitHub: [https://github.com/mattmurr/springboot-kafka-example/tree/main](https://github.com/mattmurr/springboot-kafka-example/tree/main)
