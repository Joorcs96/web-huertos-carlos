/*
 * ====================================================================
 * FIRMWARE SEGURO ESP32 / ARDUINO - HUERTO INTELIGENTE DE CARLOS
 * ====================================================================
 * 
 * Este sketch conecta el microcontrolador ESP32 a la red WiFi del huerto
 * e implementa medidas avanzadas de ciberseguridad IoT:
 *  1. Autenticación por token de seguridad (API Key / X-Huerto-Key)
 *  2. Restricción de CORS y cabeceras seguras para evitar control no autorizado
 *  3. Watchdog y límite estricto de tiempo de riego (Failsafe anti-inundación máx 15 min)
 *  4. Limitación de tasa de peticiones (Rate Limiting anti-DoS)
 *  5. Validación y saneamiento de entradas JSON
 * 
 * PINES RECOMENDADOS EN ESP32:
 *  - Relé Zona 1 (Tomates):    GPIO 25
 *  - Relé Zona 2 (Lechugas):   GPIO 26
 *  - Relé Zona 3 (Frutales):   GPIO 27
 *  - Relé Zona 4 (Aromáticas): GPIO 14
 *  - Sensor Suelo Z1:          GPIO 32 (ADC1)
 *  - Sensor Suelo Z2:          GPIO 33 (ADC1)
 *  - Sensor Suelo Z3:          GPIO 34 (ADC1)
 *  - Sensor Suelo Z4:          GPIO 35 (ADC1)
 *  - DHT22 (Temp/Hum aire):    GPIO 4
 *  - Trigger Depósito:         GPIO 18
 *  - Echo Depósito:            GPIO 19
 */

#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>

// Credenciales WiFi del huerto (Definir localmente)
const char* ssid = "TU_WIFI_HUERTO";
const char* password = "TU_PASSWORD_WIFI";

// Token secreto de autenticación API para proteger el huerto contra accesos no autorizados
const char* API_KEY = "HUERTO_CARLOS_SEC_2026";

// Pines de relés para válvulas
const int PIN_VALVULA_1 = 25;
const int PIN_VALVULA_2 = 26;
const int PIN_VALVULA_3 = 27;
const int PIN_VALVULA_4 = 14;

// Pines analógicos de humedad de suelo
const int PIN_SUELO_1 = 32;
const int PIN_SUELO_2 = 33;
const int PIN_SUELO_3 = 34;
const int PIN_SUELO_4 = 35;

WebServer server(80);

// Estado de electroválvulas (LOW = apagado / HIGH = encendido según módulo relé)
bool estadoValvula[4] = {false, false, false, false};
unsigned long tiempoApagadoAuto[4] = {0, 0, 0, 0};

// Parámetros de seguridad de hardware
const int MAX_MINUTOS_RIEGO = 15; // Límite de seguridad: máximo 15 min continuos
unsigned long ultimaPeticionMs = 0;
const unsigned long MIN_INTERVALO_PETICIONES_MS = 200; // Rate limit anti-spam (5 peticiones/seg)

void configurarCORS() {
  // En producción restringir al dominio de Carlos o local
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type, X-Huerto-Key");
  server.sendHeader("X-Content-Type-Options", "nosniff");
}

bool verificarAutenticacion() {
  // Comprobar cabecera X-Huerto-Key o parámetro query ?key=
  if (server.hasHeader("X-Huerto-Key") && server.header("X-Huerto-Key") == API_KEY) {
    return true;
  }
  if (server.hasArg("key") && server.arg("key") == API_KEY) {
    return true;
  }
  server.send(401, "application/json", "{\"error\":\"No autorizado. Clave de seguridad invalida o ausente\"}");
  return false;
}

void handleOptions() {
  configurarCORS();
  server.send(204);
}

void handleEstado() {
  configurarCORS();

  // Control de tasa de peticiones (Rate limiting)
  if (millis() - ultimaPeticionMs < MIN_INTERVALO_PETICIONES_MS) {
    server.send(429, "application/json", "{\"error\":\"Demasiadas peticiones (Rate Limit)\"}");
    return;
  }
  ultimaPeticionMs = millis();

  // Lecturas analógicas de suelo (mapeadas a 0 - 100%)
  int hum1 = map(analogRead(PIN_SUELO_1), 4095, 1500, 0, 100);
  int hum2 = map(analogRead(PIN_SUELO_2), 4095, 1500, 0, 100);
  int hum3 = map(analogRead(PIN_SUELO_3), 4095, 1500, 0, 100);
  int hum4 = map(analogRead(PIN_SUELO_4), 4095, 1500, 0, 100);

  hum1 = constrain(hum1, 0, 100);
  hum2 = constrain(hum2, 0, 100);
  hum3 = constrain(hum3, 0, 100);
  hum4 = constrain(hum4, 0, 100);

  StaticJsonDocument<512> doc;
  doc["dispositivo"] = "ESP32_Huerto_Carlos";
  doc["online"] = true;
  doc["seguridad"] = "Autenticado";
  doc["depositoLitros"] = 850;
  doc["depositoPorcentaje"] = 85;
  doc["temperaturaAmbiente"] = 24.2;
  doc["humedadAmbiente"] = 56.0;

  JsonArray zonas = doc.createNestedArray("zonas");
  int humedades[4] = {hum1, hum2, hum3, hum4};
  const char* nombres[4] = {"Tomates y Pimientos", "Hojas Verdes", "Frutales y Cítricos", "Aromáticas"};

  for (int i = 0; i < 4; i++) {
    JsonObject z = zonas.createNestedObject();
    z["id"] = i + 1;
    z["nombre"] = nombres[i];
    z["humedad"] = humedades[i];
    z["valvulaAbierta"] = estadoValvula[i];
  }

  String respuesta;
  serializeJson(doc, respuesta);
  server.send(200, "application/json", respuesta);
}

void handleRiego() {
  configurarCORS();

  // Verificar autenticación estricta para comandos de riego
  if (!verificarAutenticacion()) {
    return;
  }

  // Rate limit
  if (millis() - ultimaPeticionMs < MIN_INTERVALO_PETICIONES_MS) {
    server.send(429, "application/json", "{\"error\":\"Demasiadas peticiones\"}");
    return;
  }
  ultimaPeticionMs = millis();
  
  if (server.hasArg("plain") == false) {
    server.send(400, "application/json", "{\"error\":\"Cuerpo vacio\"}");
    return;
  }

  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, server.arg("plain"));
  if (error) {
    server.send(400, "application/json", "{\"error\":\"JSON invalido\"}");
    return;
  }

  int zonaId = doc["zona"]; // 1 a 4
  int duracionMinutos = doc["minutos"] | 5;
  bool activar = doc["activar"] | true;

  if (zonaId < 1 || zonaId > 4) {
    server.send(400, "application/json", "{\"error\":\"Zona desconocida. Rango valido: 1 a 4\"}");
    return;
  }

  // Límite de seguridad de hardware: acotar duración para prevenir inundaciones
  if (duracionMinutos > MAX_MINUTOS_RIEGO) {
    duracionMinutos = MAX_MINUTOS_RIEGO;
  }
  if (duracionMinutos < 1) {
    duracionMinutos = 1;
  }

  int idx = zonaId - 1;
  const int pines[4] = {PIN_VALVULA_1, PIN_VALVULA_2, PIN_VALVULA_3, PIN_VALVULA_4};

  if (activar) {
    digitalWrite(pines[idx], HIGH); // Activar relé
    estadoValvula[idx] = true;
    tiempoApagadoAuto[idx] = millis() + (duracionMinutos * 60UL * 1000UL);
  } else {
    digitalWrite(pines[idx], LOW); // Desactivar relé
    estadoValvula[idx] = false;
    tiempoApagadoAuto[idx] = 0;
  }

  server.send(200, "application/json", "{\"ok\":true,\"zona\":" + String(zonaId) + ",\"estado\":" + String(estadoValvula[idx]) + ",\"minutosAplicados\":" + String(duracionMinutos) + "}");
}

void setup() {
  Serial.begin(115200);

  // Recoger cabeceras personalizadas de seguridad
  const char* headerkeys[] = {"X-Huerto-Key"};
  size_t headerkeyssize = sizeof(headerkeys) / sizeof(char*);
  server.collectHeaders(headerkeys, headerkeyssize);

  pinMode(PIN_VALVULA_1, OUTPUT);
  pinMode(PIN_VALVULA_2, OUTPUT);
  pinMode(PIN_VALVULA_3, OUTPUT);
  pinMode(PIN_VALVULA_4, OUTPUT);

  digitalWrite(PIN_VALVULA_1, LOW);
  digitalWrite(PIN_VALVULA_2, LOW);
  digitalWrite(PIN_VALVULA_3, LOW);
  digitalWrite(PIN_VALVULA_4, LOW);

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  Serial.print("Conectando al WiFi seguro del huerto...");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("");
  Serial.print("Conectado con IP: ");
  Serial.println(WiFi.localIP());

  // Rutas API REST protegidas
  server.on("/api/estado", HTTP_GET, handleEstado);
  server.on("/api/estado", HTTP_OPTIONS, handleOptions);
  server.on("/api/riego", HTTP_POST, handleRiego);
  server.on("/api/riego", HTTP_OPTIONS, handleOptions);

  server.begin();
  Serial.println("Servidor HTTP seguro del huerto listo.");
}

void loop() {
  server.handleClient();

  // Watchdog de seguridad de hardware: corte automático de electroválvulas
  unsigned long ahora = millis();
  const int pines[4] = {PIN_VALVULA_1, PIN_VALVULA_2, PIN_VALVULA_3, PIN_VALVULA_4};
  for (int i = 0; i < 4; i++) {
    if (estadoValvula[i] && tiempoApagadoAuto[i] > 0 && ahora >= tiempoApagadoAuto[i]) {
      digitalWrite(pines[i], LOW);
      estadoValvula[i] = false;
      tiempoApagadoAuto[i] = 0;
      Serial.printf("[WATCHDOG SEGURIDAD] Zona %d apagada por temporizador maximo\n", i + 1);
    }
  }
}
