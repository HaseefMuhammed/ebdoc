#include <NewPing.h>

#define TRIG_PIN 9
#define ECHO_PIN 10
#define MAX_DISTANCE 200

NewPing sonar(TRIG_PIN, ECHO_PIN, MAX_DISTANCE);

#define PULSE_PIN A0

void setup() {
  Serial.begin(9600);
}

void loop() {
  // Measure height
  delay(50);
  int duration = sonar.ping_cm();
  int height = 200 - duration;  // Assuming sensor mounted at 200cm height
  
  // Measure pulse
  int pulseValue = analogRead(PULSE_PIN);
  int bpm = map(pulseValue, 0, 1023, 60, 120);  // Simulated bpm for demo

  // Send both values
  Serial.print("H:");
  Serial.print(height);
  Serial.print(",P:");
  Serial.println(bpm);

  delay(1000);
}
