#include <ESP8266WiFi.h>

const char* ssid = "ebj";
const char* password = "teb.innovations";

WiFiServer server(80);

String height = "200.00";  // Placeholder for ultrasonic sensor data from Uno
String pulse = "75";       // Placeholder for pulse data from Uno

void setup() {
  Serial.begin(9600);
  WiFi.begin(ssid, password);

  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nConnected. IP address: ");
  Serial.println(WiFi.localIP());

  server.begin();
}

void loop() {
  WiFiClient client = server.available();

  if (client) {
    Serial.println("Client connected");
    String request = "";
    unsigned long timeout = millis() + 1000;

    while (client.connected() && millis() < timeout) {
      if (client.available()) {
        char c = client.read();
        request += c;

        // End of HTTP request
        if (request.endsWith("\r\n\r\n")) {
          break;
        }
      }
    }

    // Read from Serial (Uno)
    while (Serial.available()) {
      String serialData = Serial.readStringUntil('\n');
      serialData.trim();
      if (serialData.startsWith("H:")) {
        int hIndex = serialData.indexOf("H:");
        int pIndex = serialData.indexOf(";P:");
        if (hIndex != -1 && pIndex != -1) {
          height = serialData.substring(hIndex + 2, pIndex);
          pulse = serialData.substring(pIndex + 3);
        }
      }
    }

    String response = "";
    int statusCode = 200;

    if (request.indexOf("/height") != -1) {
      response = height;
    } else if (request.indexOf("/pulse") != -1) {
      response = pulse;
    } else {
      response = "Not Found";
      statusCode = 404;
    }

    // Send complete HTTP response
    client.println("HTTP/1.1 " + String(statusCode) + (statusCode == 200 ? " OK" : " Not Found"));
    client.println("Content-Type: text/plain");
    client.println("Access-Control-Allow-Origin: *");
    client.println("Connection: close");
    client.println();
    client.println(response);

    delay(1);
    client.stop();
    Serial.println("Client disconnected");
  }
}
