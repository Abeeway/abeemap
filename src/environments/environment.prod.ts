export const environment = {
  //---- production: false
  production: true
};

//const ECOKC_API_BASE_URL = 'https://abeeway-mobile-app-eco.thingpark.com';
const ECOKC_API_BASE_URL = 'https://nano-things.net/abeemap_api_kc';

// const ECODX_API_BASE_URL = 'https://dx-api.thingpark.io';
const ECODX_API_BASE_URL = 'https://nano-things.net/abeemap_api';

// const PREVKC_API_BASE_URL = 'https://le-lab.preview.thingpark.com';
const PREVKC_API_BASE_URL = 'https://nano-things.net/abeemap_api_preview_kc';

// const PREVDX_API_BASE_URL = 'https://dx-api.preview.thingpark.com';
const PREVDX_API_BASE_URL = 'https://nano-things.net/abeemap_api_preview';


export const CONFIG:any = {

  nitURL: 'https://nano-things.net/tpxle-nit',
 
  //---- authorizationUrl: 'http://localhost:4200/login',
  authorizationUrl: 'https://nano-things.net/abeemap/login',
  response_type: 'token',
  //---- redirect_uri: 'http://localhost:4200',
  redirect_uri: 'https://nano-things.net/abeemap',
  client_id: 'abeemap',
  scope: 'sso_user abeemap_user',

  DXAPI_PROFILE: 'community-api',

  ADM_URL: "https://dev1.thingpark.com/thingpark/abeewayDeviceAnalyzer/index.php",

  DEFAULT_MAP_CENTER: [11.6739826, 47.0622886],
  DEFAULT_MAP_ZOOM: 5,

  /********************************************/
  /* Ecosystem_TPXLE with Ecosystem_Keycloak  */
  /********************************************/
  ECOKC: {
    PUBLISHED_NIT_URL: "https://community.thingpark.io/tpxle-nit",
    API_BASE_URL: ECOKC_API_BASE_URL,
    SWAGGER_UI: `${ECOKC_API_BASE_URL}/admin/latest/swagger-ui/index.html?shortUrl=tpdx-admin-api-contract.json`,
    OPERATOR_ID: "actility-tpe-ope",
    GRANT_TYPE: "password",
    REALM: "abeeway-mobile-app",
    SCOPE: "openid",
    CLIENT_ID: "tpx-le-nit",

    X_REALM: "dev1",
    MQTT_PROTOCOL: "mqtts",
    MQTT_BROKER: 'mqtt-eco.thingpark.com',
    MQTT_PORT: '8883',
    MQTT_WS_PROTOCOL: "wss",
    MQTT_WS_BROKER: 'vmq-eco.thingpark.com',
    MQTT_WS_PORT: '443',
    MQTT_WS_PATH: 'mqtt',
    MQTT_CLIENT_ID_PREFIX: 'abeemap-gui_',
  },
  
  /*********************************************/
  /* Ecosystem_TPXLE with Ecosystem_DxAdminAPI */
  /*********************************************/
  ECODX: {
    PUBLISHED_NIT_URL: "https://community.thingpark.io/tpxle-nit",
    API_BASE_URL: ECODX_API_BASE_URL,
    SWAGGER_UI: `${ECODX_API_BASE_URL}/admin/latest/swagger-ui/index.html?shortUrl=tpdx-admin-api-contract.json`,
    OPERATOR_ID: "actility-tpe-ope",
    GRANT_TYPE: "client_credentials",

    X_REALM: "dev1",
    MQTT_PROTOCOL: "mqtts",
    MQTT_BROKER: 'mqtt-eco.thingpark.com',
    MQTT_PORT: '8883',
    MQTT_WS_PROTOCOL: "wss",
    MQTT_WS_BROKER: 'vmq-eco.thingpark.com',
    MQTT_WS_PORT: '443',
    MQTT_WS_PATH: 'mqtt',
    MQTT_CLIENT_ID_PREFIX: 'abeemap-gui_',
  },
  
  /*********************************************/
  /* Preview_TPXLE with Preview_Keycloak       */
  /*********************************************/
  PREVKC: {
    PUBLISHED_NIT_URL: "https://community.thingpark.io/tpxle-nit",
    API_BASE_URL: PREVKC_API_BASE_URL,
    SWAGGER_UI: `https://nano-things.net/abeemap_api_preview_kc/admin/latest/swagger-ui/index.html?shortUrl=tpdx-admin-api-contract.json`,
    OPERATOR_ID: "dev-ope",
    GRANT_TYPE: "password",
    REALM: "le-lab",
    SCOPE: "openid",
    CLIENT_ID: "tpx-le-nit",

    X_REALM: "rnd",
    MQTT_PROTOCOL: "mqtts",
    MQTT_BROKER: 'mqtt.preview.thingpark.com',
    MQTT_PORT: '8883',
    MQTT_WS_PROTOCOL: "wss",
    MQTT_WS_BROKER: 'mqtt.preview.thingpark.com',
    MQTT_WS_PORT: '880',
    MQTT_WS_PATH: 'mqtt',
    MQTT_CLIENT_ID_PREFIX: 'abeemap-gui_',
  },
  /*********************************************/
  /* Preview_TPXLE with Preview_DxAdminAPI     */
  /*********************************************/
  PREVDX: {
    PUBLISHED_NIT_URL: "https://community.thingpark.io/tpxle-nit",
    API_BASE_URL: PREVDX_API_BASE_URL,
    SWAGGER_UI: `${PREVDX_API_BASE_URL}/admin/latest/swagger-ui/index.html?shortUrl=tpdx-admin-api-contract.json`,
    OPERATOR_ID: "dev-ope",
    GRANT_TYPE: "client_credentials",

    X_REALM: "rnd",
    MQTT_PROTOCOL: "mqtts",
    MQTT_BROKER: 'mqtt.preview.thingpark.com',
    MQTT_PORT: '8883',
    MQTT_WS_PROTOCOL: "wss",
    MQTT_WS_BROKER: 'mqtt.preview.thingpark.com',
    MQTT_WS_PORT: '880',
    MQTT_WS_PATH: 'mqtt',
    MQTT_CLIENT_ID_PREFIX: 'abeemap-gui_',
  }

};


// Building for production platform:
// ng build --build-optimizer --base-href /abeemap/
