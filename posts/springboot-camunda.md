---
title: "Adding Camunda to your Spring Boot App"
description: "Adding Camunda BPM to a Spring Boot + Kafka application"
date: "2023-03-21"
draft: true
---

I was recently introduced to the idea of BPM, for those not in the know, this is
Business Process Management.

At first I was thinking, this is part of the no-code movement.

Activiti is just a flavour of BPMN

Camunda seems to be a popular choice, forked from Activiti 5 (confirm?) and now
making it's transformation into the cloud with Camunda 8. I plan to do an
article on BPMN itself when I learn more.

This article follows on from
["Adding Kafka to your Spring Boot App"](../springboot-kafka/).

The app currently allows user's to call a register endpoint which creates a row
in the database and sends/receives a message to/from a Kafka topic. We will be
extending this to kick off a BPM process which requires a human to verify the
user registration, and updates the DB.

Let's start by defining our BPM process in the
[Camunda Modeler](https://camunda.com/download/modeler/).

{% image "./assets/img/Screenshot 2023-03-22 at 21.47.48.png", "Camunda Modeler" %}

<details>
<summary><code>process.bpmn</code></summary>

```xml
<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:camunda="http://camunda.org/schema/1.0/bpmn" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xmlns:modeler="http://camunda.org/schema/modeler/1.0" id="Definitions_0lt0ui5" targetNamespace="http://bpmn.io/schema/bpmn" exporter="Camunda Modeler" exporterVersion="5.9.0" modeler:executionPlatform="Camunda Platform" modeler:executionPlatformVersion="7.18.0">
  <bpmn:process id="my-process" isExecutable="true">
    <bpmn:endEvent id="EndEvent_1">
      <bpmn:incoming>Flow_0wxujlh</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_0wxujlh" sourceRef="Activity_02hrghz" targetRef="EndEvent_1" />
    <bpmn:serviceTask id="Activity_02hrghz" name="Update user verified" camunda:delegateExpression="${updateUserVerifiedTask}">
      <bpmn:extensionElements />
      <bpmn:incoming>Flow_1e3gp44</bpmn:incoming>
      <bpmn:outgoing>Flow_0wxujlh</bpmn:outgoing>
    </bpmn:serviceTask>
    <bpmn:startEvent id="StartEvent_1">
      <bpmn:outgoing>Flow_1tqbhv1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:userTask id="Activity_0fqqntr" name="Verify user">
      <bpmn:incoming>Flow_1tqbhv1</bpmn:incoming>
      <bpmn:outgoing>Flow_1e3gp44</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:sequenceFlow id="Flow_1e3gp44" sourceRef="Activity_0fqqntr" targetRef="Activity_02hrghz" />
    <bpmn:sequenceFlow id="Flow_1tqbhv1" sourceRef="StartEvent_1" targetRef="Activity_0fqqntr" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="my-process">
      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1">
        <dc:Bounds x="179" y="99" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Activity_0ujkyug_di" bpmnElement="Activity_02hrghz">
        <dc:Bounds x="490" y="77" width="100" height="80" />
        <bpmndi:BPMNLabel />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Event_1kuienc_di" bpmnElement="EndEvent_1">
        <dc:Bounds x="622" y="99" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Activity_177zn4a_di" bpmnElement="Activity_0fqqntr">
        <dc:Bounds x="340" y="77" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_0wxujlh_di" bpmnElement="Flow_0wxujlh">
        <di:waypoint x="590" y="117" />
        <di:waypoint x="622" y="117" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_1e3gp44_di" bpmnElement="Flow_1e3gp44">
        <di:waypoint x="440" y="117" />
        <di:waypoint x="490" y="117" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_1tqbhv1_di" bpmnElement="Flow_1tqbhv1">
        <di:waypoint x="215" y="117" />
        <di:waypoint x="340" y="117" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>
```

</details>

The first task is a Human Task which blocks the flow until it is completed, the
sequence then delegates to a `UpdateUserVerifiedTask`, which we will write in
our project.

Let's start by adding the Camunda Spring Boot starter dependency:

```gradle
dependencies {
	...
	implementation 'org.camunda.bpm.springboot:camunda-bpm-spring-boot-starter-webapp:7.18.0'
}
```

I'm going to create a `@Service` class which extends the `JavaDelegate`
interface provided by Camunda. This is where we implement the logic of the task
in our BPM process.

We will be updating the verified status of the user of which the process is
invoked for. We will be accessing the ID from the context of the task, of which
we add variables:

```java
@Service
public class UpdateUserVerifiedTask implements JavaDelegate {

	@Override
	public void execute(DelegateExecution execution) throws Exception {
		var id = (Long)execution.getVariable("ID");
		userRepository.findById(id).ifPresentOrElse((user) -> {
			user.setVerified(true);
			userRepository.save(user);
		}, () -> {
			// Our user didn't exist, Maybe throw an exception or ignore.
		});
	}
}
```

To add the verified column, just update the `UserRecord`:

```java
@Entity
class UserRecord {
	...

	private boolean verified;

	public boolean isVerified() {
		return verified;
	}
}
```

Starting the BPM process, we can modify our `listen` method within the
`UserService`:

```java
@KafkaListener(topics = KafkaConfig.USER_REGISTERED_TOPIC, groupId = KafkaConfig.GROUP_ID)
public void listen(String msg) {
	System.out.println("Kafka Listener received msg: " + msg);
	runtimeService.startProcessInstanceByKey("my-process", Map.of("ID", Long.valueOf(msg)));
}
```

Finally, we want to be able to check the verified state of a user, just add a
GET endpoint to our `UserController`:

```java
@GetMapping("/{userId}")
public Boolean isUserVerified(@PathVariable Long userId) {
	return userService.isUserVerified(userId);
}
```

And in the `UserService`:

```java
public Boolean isUserVerified(Long userId) {
	return userRepository.findById(userId)
		.orElseThrow(() -> new RuntimeException("User not found"))
		.isVerified();
}
```
