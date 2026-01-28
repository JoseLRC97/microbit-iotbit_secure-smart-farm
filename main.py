# <--- REQUIRED CONFIG --->
wifi_router = "Your Router ID"
wifi_password = "Your Router Password"
mqtt_broker = "Your Broker IP"

# --- Statets ---
DISCONNECTED = "OFF"
CONNECTED = "ON"
RECONNECTING = "RECO"
EXISTING_CHANGES = "YES"
NO_EXISTING_CHANGES = "NO"
MOVE_DETECTED = True
MOVE_UNDETECTED = False
LIGTH_ON = True
LIGHT_OFF = False
ALARM_ON = True
ALARM_OFF = False
OPEN = "OPEN"
CLOSED = "CLOSED"
STOPPED = "STOPPED"
WATER_GO_UP = True
WATER_GO_DOWN = False

# --- Intervals ---
WIFI_LOOP_INTERVAL = 15000
MQTT_LOOP_INTERVAL = 15000
OLED_LOOP_INTERVAL = 1000
LIGHT_LOOP_INTERVAL = 2000
GTH_LOOP_INTERVAL = 30000
WATER_LEVEL_LOOP_INTERVAL = 3000

# --- Variables ---
wifi_state = DISCONNECTED
previus_wifi_state = wifi_state
PIR_present = MOVE_UNDETECTED
sonar_distance = 0
light_state = LIGHT_OFF
alarm_state = ALARM_OFF
global_temperature = 0
global_humidity = 0
previus_global_temperature = global_temperature
previus_global_humidity = global_humidity
door_state = CLOSED
roof_state = CLOSED
previus_door_state = door_state
previus_roof_state = roof_state
water_level = 0
previus_water_level = water_level
water_level_state = WATER_GO_DOWN
mqtt_port = 1885
mqtt_user = "iot_client"
mqtt_password = "secreto_muy_fuerte"
mqtt_client_id = "microbit-iotbit"
mqtt_state = DISCONNECTED
mqtt_previus_state = mqtt_state

# -- Handlers --
# # PIR Presence Detected Handler
def PIR_start_handler():
    global PIR_present
    PIR_present = MOVE_DETECTED
    Public_PIR_values()

# PIR Presence Undetected Handler
def PIR_end_handler():
    global PIR_present
    PIR_present = MOVE_UNDETECTED
    Public_PIR_values()

# --- WiFi Functions ---
# Connect WiFi Function
def Connect_wifi():
    ESP8266_IoT.init_wifi(SerialPin.P8, SerialPin.P12, BaudRate.BAUD_RATE115200)
    ESP8266_IoT.connect_wifi(wifi_router, wifi_password)

# Check WiFi connection status Function
def Check_wifi():
    global wifi_state
    if ESP8266_IoT.wifi_state(True):
        wifi_state = CONNECTED
    else:
        ESP8266_IoT.reset_esp8266()
        basic.pause(10000)
        wifi_state = DISCONNECTED
        Connect_wifi()

# --- Sensors, Servos, Screen & Led Functions ---
# Lights of Alarm Function
def Turn_on_lights():
    global light_state, alarm_state, strip
    if not light_state and alarm_state:
        strip.show_color(neopixel.rgb(70, 0, 0))
        light_state = LIGTH_ON
    else:
        strip.show_color(neopixel.colors(NeoPixelColors.BLACK))
        light_state = LIGHT_OFF

# Update Water Level Function
def Read_water_sensor():
    global water_level, water_level_state
    water_device_id = "water_level_sensor"
    water_level = Environment.read_water_level(AnalogPin.P3)
    water_level_state = WATER_GO_UP if int(water_level) > 50 else WATER_GO_DOWN
    timestamp = int(input.running_time() / 1000)
    payload = "deviceId=%s|timestamp=%i|value=%i" % (water_device_id, timestamp, water_level_state)
    ESP8266_IoT.publish_mqtt_message(payload, "sensors/water_level", ESP8266_IoT.QosList.QOS0)

# Update Temperature & Humidity Function
def Read_temperature_humidity_sensor():
    global global_temperature, global_humidity
    device_id = "DHT11"
    global_temperature = Environment.dht11value(Environment.DHT11Type.DHT11_TEMPERATURE_C, DigitalPin.P13)
    basic.pause(5000)
    global_humidity = Environment.dht11value(Environment.DHT11Type.DHT11_HUMIDITY, DigitalPin.P13)
    timestamp = int(input.running_time() / 1000)
    payload = "deviceId=%s|timestamp=%i|temp=%d|humi=%i" % (
        device_id, timestamp, global_temperature, global_humidity)
    ESP8266_IoT.publish_mqtt_message(payload, "sensors/temp_humidity", ESP8266_IoT.QosList.QOS0)

# Close Door or Roof Function
def Update_servo_close():
    pins.servo_write_pin(AnalogPin.P16, 0)

# Open Door or Roof Function
def Update_servo_open():
    pins.servo_write_pin(AnalogPin.P16, 180)

# Stop Door or Roof Function
def Update_servo_stop():
    pins.servo_write_pin(AnalogPin.P16, 90)

# Update Environment Information
def Update_oled_screen():
    global previus_wifi_state, wifi_state
    global previus_global_temperature, previus_global_humidity
    global global_temperature, global_humidity
    global door_state, previus_door_state
    global water_level, previus_water_level
    global mqtt_state, mqtt_previus_state
    global roof_state, previus_roof_state

    changes = NO_EXISTING_CHANGES

    if wifi_state != previus_wifi_state:
        changes = EXISTING_CHANGES
        previus_wifi_state = wifi_state
    elif previus_global_temperature != global_temperature or previus_global_humidity != global_humidity:
        changes = EXISTING_CHANGES
        previus_global_temperature = global_temperature
        previus_global_humidity = global_humidity
    elif previus_door_state != door_state:
        changes = EXISTING_CHANGES
        previus_door_state = door_state
    elif previus_water_level != water_level:
        changes = EXISTING_CHANGES
        previus_water_level = water_level
    elif mqtt_previus_state != mqtt_state:
        changes = EXISTING_CHANGES
        mqtt_previus_state = mqtt_state
    elif previus_roof_state != roof_state:
        changes = EXISTING_CHANGES
        previus_roof_state = roof_state

    if changes == EXISTING_CHANGES:
        OLED.clear()
        OLED.write_string_new_line("WiFi " + wifi_state + " / MQTT " + mqtt_state)
        OLED.draw_line(0, 12, 127, 12)
        OLED.write_string_new_line("")
        OLED.write_string_new_line("Global Temp: " + str(global_temperature) + " C")
        OLED.write_string_new_line("Global Humi: " + str(global_humidity))
        OLED.write_string_new_line("Water Level: " + str(water_level) + "%")
        OLED.draw_line(0, 44, 127, 44)
        OLED.write_string_new_line("")
        OLED.write_string_new_line("Door: " + door_state)
        OLED.write_string_new_line("Roof: " + roof_state)

# --- MQTT Functions ---
# Connect to MQTT Broker Function
def Connect_mqtt_broker():
    ESP8266_IoT.set_mqtt(
        ESP8266_IoT.SchemeList.TCP,
        mqtt_client_id,
        mqtt_user,
        mqtt_password,
        ""
    )
    ESP8266_IoT.connect_mqtt(mqtt_broker, mqtt_port, True)

# Check MQTT Connection state Function
def Check_mqtt_state():
    global mqtt_state
    if ESP8266_IoT.is_mqtt_broker_connected():
        mqtt_state = CONNECTED
    else:
        mqtt_state = DISCONNECTED
        Connect_mqtt_broker()

# Send Presence values with MQTT
def Public_PIR_values():
    PIR_sensor_id = "presence_sensor"
    timestamp = int(input.running_time() / 1000)
    payload = "deviceId=%s|timestamp=%s|value=%i" % (PIR_sensor_id, timestamp, PIR_present)
    ESP8266_IoT.publish_mqtt_message(payload, "sensors/presence", ESP8266_IoT.QosList.QOS0)

# Receive Commands to Door and detect if Alarm have to Turn On or Turn Off
def On_door_command(message):
    global door_state, alarm_state
    if not message:
        return
    if "command=OPEN" in message:
        Update_servo_open()
        door_state = OPEN
    elif "command=CLOSE" in message:
        Update_servo_close()
        door_state = CLOSED
    elif "command=STOP" in message:
        Update_servo_stop()
        door_state = STOPPED

# Receive Commands to Roof and detect if Alarm have to Turn On or Turn Off
def On_roof_command(message):
    global roof_state, alarm_state
    if not message:
        return
    if "command=OPEN" in message:
        Update_servo_open()
        roof_state = OPEN
    elif "command=CLOSE" in message:
        Update_servo_close()
        roof_state = CLOSED
    elif "command=STOP" in message:
        Update_servo_stop()
        roof_state = STOPPED

# Receive if Alarm have to Turn On or Turn Off
def On_alert_notification(message):
    global alarm_state
    if not message:
        return
    if "command=TURN_ON" in message:
        alarm_state = ALARM_ON
    elif "command=TURN_OFF" in message:
        alarm_state = ALARM_OFF

# --- MICROBIT INIT ---
# Init
led.enable(False)
OLED.init(128, 64)
OLED.write_string("INITIALIZING")
basic.pause(3000)
OLED.draw_loading(0)

while wifi_state != CONNECTED:
    Connect_wifi()
    Check_wifi()
    basic.pause(10000)

OLED.draw_loading(25)

while mqtt_state != CONNECTED:
    Connect_mqtt_broker()
    Check_mqtt_state()
    basic.pause(10000)

OLED.draw_loading(50)

strip = neopixel.create(DigitalPin.P9, 1, NeoPixelMode.RGB)
pins.on_pulsed(DigitalPin.P1, PulseValue.LOW, PIR_start_handler)
pins.on_pulsed(DigitalPin.P1, PulseValue.HIGH, PIR_end_handler)

OLED.draw_loading(70)

loops.every_interval(WIFI_LOOP_INTERVAL, Check_wifi)
loops.every_interval(MQTT_LOOP_INTERVAL, Check_mqtt_state)
loops.every_interval(OLED_LOOP_INTERVAL, Update_oled_screen)
loops.every_interval(LIGHT_LOOP_INTERVAL, Turn_on_lights)
loops.every_interval(GTH_LOOP_INTERVAL, Read_temperature_humidity_sensor)
loops.every_interval(WATER_LEVEL_LOOP_INTERVAL, Read_water_sensor)

OLED.draw_loading(90)

ESP8266_IoT.mqtt_event("actuators/roof", ESP8266_IoT.QosList.QOS0, On_roof_command)
ESP8266_IoT.mqtt_event("actuators/door", ESP8266_IoT.QosList.QOS0, On_door_command)
ESP8266_IoT.mqtt_event("notification/alert", ESP8266_IoT.QosList.QOS0, On_alert_notification)

OLED.draw_loading(100)
basic.pause(1000)