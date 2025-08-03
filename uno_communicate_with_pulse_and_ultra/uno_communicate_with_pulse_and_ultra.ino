#define trigPin 9
#define echoPin 8
#define pulsePin A0

const int baseHeight = 200; // Sensor placed 200 cm from ground

void setup() {
  Serial.begin(9600);
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
}

void loop() {
  // Ultrasonic
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);
  long duration = pulseIn(echoPin, HIGH);
  float distance = duration * 0.034 / 2;
  float personHeight = baseHeight - distance;

  // Pulse sensor
  int pulse = analogRead(pulsePin);
  pulse = map(pulse, 500, 1023, 50, 120); // scale to BPM range

  // Sanitize height
  if (personHeight < 50 || personHeight > 200) personHeight = 0;

  // Send to ESP
  Serial.print("H:");
  Serial.print(personHeight, 1);
  Serial.print(";P:");
  Serial.println(pulse);

  delay(1000);
}
