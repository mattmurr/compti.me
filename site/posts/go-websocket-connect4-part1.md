---
title: Making a multiplayer game with Go & WebSockets
description: Part 1 of Making a multiplayer game with Go & WebSockets while learning to gopher
date: 2021-08-24
---

I'm taking a day off work to recover from illness and decided to pass time playing around with Go. I recently used [Socket.IO](https://socket.io) to write a Connect4 demo with NodeJS and [Svelte](https://svelte.dev/) so decided to essentially rewrite this from scratch.

Start off by creating and initializing a directory with `go mod init`

```shell
mkdir connect4
cd connect4
go mod init <module-name>
```

where `<module-name>` looks something like `example.com/connect4`

I like to start off with a quick hello world anytime I switch to a different language, this allows me to remember the syntax for the language, the entrypoint for a Go executable program is the `main` package, I've put the following code in a `main.go` file:

```go
package main

func main() {
  println("Hello world!")
}
```

We can run this:

```shell
go run .
```

You should see the message printed to the terminal, if you can't get this to work, then you're better off learning some Go basics, I've used this site in the past [Learn Go With Tests](https://quii.gitbook.io/learn-go-with-tests/)

I've been trying to adopt a <abbr title="Test-driven development">TDD</abbr> workflow, lets start by writing a test and writing the code until the test passes.

I'll be using the [Gorilla WebSocket module](https://github.com/gorilla/websocket), Let's create a test file, I'll call this main\_test.go: 

```go
package main

import (
    "net/http"
    "net/http/httptest"
    "strings"
    "testing"

    "github.com/gorilla/websocket"
)

func TestWsServer(t *testing.T) {
    t.Run("Can connect to WebSocket server", func(t *testing.T) {
        server := httptest.NewServer(http.HandlerFunc(handler))
        defer server.Close()

        url := "ws" + strings.TrimPrefix(server.URL, "http") + "/"

        ws, res, err := websocket.DefaultDialer.Dial(url, nil)
        if err != nil {
            t.Errorf("Could not open a ws connection on '%s' '%v'", url, err)
        }

        const expectedStatus = http.StatusSwitchingProtocols
        if res.StatusCode != expectedStatus {
            t.Errorf("Expected status '%d', got '%d'", expectedStatus, res.StatusCode)
        }

        defer ws.Close()
    })
}
```

Run the tests with `go test -v` (the `-v` flag gives us more verbose output). As expected, our test will fail. We need to define the handler function, it must use the same function signature as the [`http.HandlerFunc`](https://pkg.go.dev/net/http#HandlerFunc) interface. Let's make this function so we can begin to fulfil the test expectations. Head back to `main.go` and define the function:

```go
package main

import (
    "net/http"
)

func handler(w http.ResponseWriter, r *http.Request) {}

func main() {
    println("Hello world!")
}
```

Upon running the test again, we will find that we are presented with a new error message:
`Could not open a ws connection on 'ws://127.0.0.1:38009/' 'websocket: bad handshake'`
This is from our test, so we know we got that far. We're not doing any in our handler function, we should be upgrading the HTTP connection to the WebSocket protocol. `Gorilla WebSocket` provides a way to do this:

```go
package main

import (
    "log"
    "net/http"

    "github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{}

func handler(w http.ResponseWriter, r *http.Request) {
    c, err := upgrader.Upgrade(w, r, nil)
    if err != nil {
        log.Print("upgrade: ", err)
    }
    defer c.Close()
}

func main() {
    println("Hello world!")
}
```

If we run the test now, it should pass. We have a working WebSocket server, which does absolutely nothing interesting at the moment. We should be able to send messages back and forth between the server and it's connected clients.

Again let's write the test first, I'm going to make this a sub-test of our existing `Can connect to WebSocket server` test so we don't repeatedly bring the WebSockets server up and down:

```go
t.Run("Can connect to WebSocket server", func(t *testing.T) {
    ...

    defer ws.Close()

    t.Run("Sends message successfully", func(t *testing.T) {
      expectedMessageType := websocket.TextMessage
      expectedMessage := []byte("Hello world!")
			
      err := ws.WriteMessage(expectedMessageType, expectedMessage)
      if err != nil {
        t.Errorf("Unable to write message '%v'", err)
      }
    }
)}
```

Testing this should be successful but our test doesn't expect anything to be done with the message, only that it was sent successfully. Let's try and make server mimic whatever messages are sent from the client:

Add yet another sub-test so the server can respond to the "Hello world!" message:

```go
t.Run("Can connect to WebSocket server", func(t *testing.T) {
    ...

    defer ws.Close()

    t.Run("Sends message successfully", func(t *testing.T) {
        ...

        t.Run("Recieves the same message and message type in response", func(t *testing.T) {
            mt, message, err := ws.ReadMessage()
            if err != nil {
                t.Errorf("Could not read message '%v'", err)
            } else {
                if mt != expectedMessageType {
                    t.Errorf("Expected message type '%d', got '%d'", expectedMessageType, mt)
                }
                if bytes.Compare(message, expectedMessage) != 0 {
                    t.Errorf("Expected message '%s', got '%s'", expectedMessage, message)
                }
            }
        }
    }
)}
```

Running this will now result in a failed test, our server is not programmed to respond to messages. Let's update our handler function to do that:

```go
func handler(w http.ResponseWriter, r *http.Request) {
	...

  for {
		mt, message, err := c.ReadMessage()
		if err != nil {
			log.Printf("Read error '%v'", err)
			break
		}

    err = c.WriteMessage(mt, message)
		if err != nil {
			log.Printf("Write error '%v'", err)
			break
		}
	}
}
```

By using a loop we can continuously check for messages from any established WebSocket connection and whenever it does... mimic the client and send the same message back.

We can transmit any sort of data through a WebSocket message as we are essentially sending a byte array, albeit small datasets are preferred. For our game, we will send data back and forth similar to this model: 

```json
{
  "event": "MyEvent",
  "data": <Some JSON data type>
}
```

You can find the source code for the content in this post [here](https://github.com/mattmurr/go-websocket-connect4/tree/part-1)

In the next post, I am making a simple web UI that can connect to our WebSocket server using Go's powerful HTML templating and JavaScript.
