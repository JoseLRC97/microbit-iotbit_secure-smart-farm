//  <--- REQUIRED CONFIG --->
let wifi_router = "Your Router ID"
let wifi_password = "Your Router Password"
let mqtt_broker = "Your Broker IP"
//  --- Statets ---
let DISCONNECTED = "OFF"
let CONNECTED = "ON"
let RECONNECTING = "RECO"
let EXISTING_CHANGES = "YES"
let NO_EXISTING_CHANGES = "NO"
let MOVE_DETECTED = true
let MOVE_UNDETECTED = false
let LIGTH_ON = true
let LIGHT_OFF = false
let ALARM_ON = true
let ALARM_OFF = false
let OPEN = "OPEN"
let CLOSED = "CLOSED"
let STOPPED = "STOPPED"
let WATER_GO_UP = true
let WATER_GO_DOWN = false
//  --- Intervals ---
let WIFI_LOOP_INTERVAL = 15000
let MQTT_LOOP_INTERVAL = 15000
let OLED_LOOP_INTERVAL = 1000
let LIGHT_LOOP_INTERVAL = 2000
let GTH_LOOP_INTERVAL = 30000
let WATER_LEVEL_LOOP_INTERVAL = 5000
//  --- Variables ---
let wifi_state = DISCONNECTED
let previus_wifi_state = wifi_state
let PIR_present = MOVE_UNDETECTED
let sonar_distance = 0
let light_state = LIGHT_OFF
let alarm_state = ALARM_OFF
let global_temperature = 0
let global_humidity = 0
let previus_global_temperature = global_temperature
let previus_global_humidity = global_humidity
let door_state = OPEN
let roof_state = OPEN
let previus_door_state = door_state
let previus_roof_state = roof_state
let water_level = 0
let previus_water_level = water_level
let water_level_state = WATER_GO_DOWN
let mqtt_port = 1885
let mqtt_user = "iot_client"
let mqtt_password = "secreto_muy_fuerte"
let mqtt_client_id = "microbit-iotbit"
let mqtt_state = DISCONNECTED
let mqtt_previus_state = mqtt_state
//  -- Handlers --
//  # PIR Presence Detected Handler
//  PIR Presence Undetected Handler
//  --- WiFi Functions ---
//  Connect WiFi Function
function Connect_wifi() {
    ESP8266_IoT.initWIFI(SerialPin.P8, SerialPin.P12, BaudRate.BaudRate115200)
    ESP8266_IoT.connectWifi(wifi_router, wifi_password)
}

//  Check WiFi connection status Function
function Check_wifi() {
    
    if (ESP8266_IoT.wifiState(true)) {
        wifi_state = CONNECTED
    } else {
        ESP8266_IoT.resetEsp8266()
        basic.pause(10000)
        wifi_state = DISCONNECTED
        Connect_wifi()
    }
    
}

//  --- Sensors, Servos, Screen & Led Functions ---
//  Lights of Alarm Function
//  Update Water Level Function
//  Update Temperature & Humidity Function
//  Close Door or Roof Function
function Update_servo_close() {
    pins.servoWritePin(AnalogPin.P16, 0)
}

//  Open Door or Roof Function
function Update_servo_open() {
    pins.servoWritePin(AnalogPin.P16, 180)
}

//  Stop Door or Roof Function
function Update_servo_stop() {
    pins.servoWritePin(AnalogPin.P16, 90)
}

//  Update Environment Information
//  --- MQTT Functions ---
//  Connect to MQTT Broker Function
function Connect_mqtt_broker() {
    ESP8266_IoT.setMQTT(ESP8266_IoT.SchemeList.TCP, mqtt_client_id, mqtt_user, mqtt_password, "")
    ESP8266_IoT.connectMQTT(mqtt_broker, mqtt_port, true)
}

//  Check MQTT Connection state Function
function Check_mqtt_state() {
    
    if (ESP8266_IoT.isMqttBrokerConnected()) {
        mqtt_state = CONNECTED
    } else {
        mqtt_state = DISCONNECTED
        Connect_mqtt_broker()
    }
    
}

//  Send Presence values with MQTT
function Public_PIR_values() {
    let PIR_sensor_id = "presence_sensor"
    let timestamp = Math.trunc(input.runningTime() / 1000)
    let payload = `deviceId=${PIR_sensor_id}|timestamp=${timestamp}|value=${PIR_present}`
    ESP8266_IoT.publishMqttMessage(payload, "sensors/presence", ESP8266_IoT.QosList.Qos0)
}

//  Receive Commands to Door and detect if Alarm have to Turn On or Turn Off
//  Receive Commands to Roof and detect if Alarm have to Turn On or Turn Off
//  Receive if Alarm have to Turn On or Turn Off
//  --- MICROBIT INIT ---
//  Init
led.enable(false)
OLED.init(128, 64)
OLED.writeString("INITIALIZING")
basic.pause(3000)
OLED.drawLoading(0)
//  Connect to Router
while (wifi_state != CONNECTED) {
    Connect_wifi()
    Check_wifi()
    basic.pause(10000)
}
OLED.drawLoading(25)
//  Connect to MQTT Broker
while (mqtt_state != CONNECTED) {
    Connect_mqtt_broker()
    Check_mqtt_state()
    basic.pause(10000)
}
OLED.drawLoading(50)
//  Configure LED and Interrupts
let strip = neopixel.create(DigitalPin.P9, 1, NeoPixelMode.RGB)
pins.onPulsed(DigitalPin.P1, PulseValue.Low, function PIR_start_handler() {
    
    PIR_present = MOVE_DETECTED
    Public_PIR_values()
})
pins.onPulsed(DigitalPin.P1, PulseValue.High, function PIR_end_handler() {
    
    PIR_present = MOVE_UNDETECTED
    Public_PIR_values()
})
OLED.drawLoading(60)
//  Configure servo with the servo state
Update_servo_open()
OLED.drawLoading(75)
//  Define Tasks
loops.everyInterval(WIFI_LOOP_INTERVAL, Check_wifi)
loops.everyInterval(MQTT_LOOP_INTERVAL, Check_mqtt_state)
loops.everyInterval(OLED_LOOP_INTERVAL, function Update_oled_screen() {
    
    
    
    
    
    
    
    let changes = NO_EXISTING_CHANGES
    if (wifi_state != previus_wifi_state) {
        changes = EXISTING_CHANGES
        previus_wifi_state = wifi_state
    } else if (previus_global_temperature != global_temperature || previus_global_humidity != global_humidity) {
        changes = EXISTING_CHANGES
        previus_global_temperature = global_temperature
        previus_global_humidity = global_humidity
    } else if (previus_door_state != door_state) {
        changes = EXISTING_CHANGES
        previus_door_state = door_state
    } else if (previus_water_level != water_level) {
        changes = EXISTING_CHANGES
        previus_water_level = water_level
    } else if (mqtt_previus_state != mqtt_state) {
        changes = EXISTING_CHANGES
        mqtt_previus_state = mqtt_state
    } else if (previus_roof_state != roof_state) {
        changes = EXISTING_CHANGES
        previus_roof_state = roof_state
    }
    
    if (changes == EXISTING_CHANGES) {
        OLED.clear()
        OLED.writeStringNewLine("WiFi " + wifi_state + " / MQTT " + mqtt_state)
        OLED.drawLine(0, 12, 127, 12)
        OLED.writeStringNewLine("")
        OLED.writeStringNewLine("Global Temp: " + ("" + global_temperature) + " C")
        OLED.writeStringNewLine("Global Humi: " + ("" + global_humidity))
        OLED.writeStringNewLine("Water Level: " + ("" + water_level) + "%")
        OLED.drawLine(0, 44, 127, 44)
        OLED.writeStringNewLine("")
        OLED.writeStringNewLine("Door: " + door_state)
        OLED.writeStringNewLine("Roof: " + roof_state)
    }
    
})
loops.everyInterval(LIGHT_LOOP_INTERVAL, function Turn_on_lights() {
    
    if (!light_state && alarm_state) {
        strip.showColor(neopixel.rgb(70, 0, 0))
        light_state = LIGTH_ON
    } else {
        strip.showColor(neopixel.colors(NeoPixelColors.Black))
        light_state = LIGHT_OFF
    }
    
})
loops.everyInterval(GTH_LOOP_INTERVAL, function Read_temperature_humidity_sensor() {
    
    let device_id = "DHT11"
    global_temperature = Environment.dht11value(Environment.DHT11Type.DHT11_temperature_C, DigitalPin.P13)
    global_humidity = Environment.dht11value(Environment.DHT11Type.DHT11_humidity, DigitalPin.P13)
    let timestamp = Math.trunc(input.runningTime() / 1000)
    let payload = `deviceId=${device_id}|timestamp=${timestamp}|temp=${global_temperature}|humi=${global_humidity}`
    ESP8266_IoT.publishMqttMessage(payload, "sensors/temp_humidity", ESP8266_IoT.QosList.Qos0)
})
loops.everyInterval(WATER_LEVEL_LOOP_INTERVAL, function Read_water_sensor() {
    
    let water_device_id = "water_level_sensor"
    water_level = Environment.ReadWaterLevel(AnalogPin.P3)
    water_level_state = Math.trunc(water_level) > 50 ? WATER_GO_UP : WATER_GO_DOWN
    let timestamp = Math.trunc(input.runningTime() / 1000)
    let payload = `deviceId=${water_device_id}|timestamp=${timestamp}|value=${water_level_state}`
    ESP8266_IoT.publishMqttMessage(payload, "sensors/water_level", ESP8266_IoT.QosList.Qos0)
})
OLED.drawLoading(90)
//  Define MQTT events to recieve
ESP8266_IoT.MqttEvent("actuators/roof", ESP8266_IoT.QosList.Qos0, function On_roof_command(message: string) {
    
    if (message.indexOf("command=OPEN") >= 0) {
        Update_servo_open()
        roof_state = OPEN
    } else if (message.indexOf("command=CLOSE") >= 0) {
        Update_servo_close()
        roof_state = CLOSED
    } else if (message.indexOf("command=STOP") >= 0) {
        Update_servo_stop()
        roof_state = STOPPED
    }
    
})
ESP8266_IoT.MqttEvent("actuators/door", ESP8266_IoT.QosList.Qos0, function On_door_command(message: string) {
    
    if (message.indexOf("command=OPEN") >= 0) {
        Update_servo_open()
        door_state = OPEN
    } else if (message.indexOf("command=CLOSE") >= 0) {
        Update_servo_close()
        door_state = CLOSED
    } else if (message.indexOf("command=STOP") >= 0) {
        Update_servo_stop()
        door_state = STOPPED
    }
    
})
ESP8266_IoT.MqttEvent("notification/alert", ESP8266_IoT.QosList.Qos0, function On_alert_notification(message: string) {
    
    if (message.indexOf("command=TURN_ON") >= 0) {
        alarm_state = ALARM_ON
    } else if (message.indexOf("command=TURN_OFF") >= 0) {
        alarm_state = ALARM_OFF
    }
    
})
OLED.drawLoading(100)
basic.pause(1000)
