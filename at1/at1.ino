#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>

const char* ssid = "ebj";                   // Your Wi-Fi SSID
const char* password = "teb.innovations";   // Your Wi-Fi Password

const int trigPin = D5;  // Ultrasonic Sensor TRIG
const int echoPin = D6;  // Ultrasonic Sensor ECHO

ESP8266WebServer server(80);

void setup() {
  Serial.begin(115200);
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);

  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nConnected to Wi-Fi");
  Serial.print("ESP IP Address: ");
  Serial.println(WiFi.localIP());

  server.on("/height", []() {
    long duration;
    float distance;

    // Send trigger pulse
    digitalWrite(trigPin, LOW);
    delayMicroseconds(2);
    digitalWrite(trigPin, HIGH);
    delayMicroseconds(10);
    digitalWrite(trigPin, LOW);

    duration = pulseIn(echoPin, HIGH, 30000); // 30ms timeout
    if (duration == 0) {
      server.sendHeader("Access-Control-Allow-Origin", "*");
      server.send(200, "text/plain", "Sensor Timeout");
      return;
    }

    distance = duration * 0.034 / 2.0;
    float height = 200.0 - distance; // assuming max height is 200cm

    // Add CORS header
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send(200, "text/plain", String(height, 1));
  });

  server.begin();
  Serial.println("Server started.");
}

void loop() {
  server.handleClient();
}
