# Site Checker
Site Checker es una herramienta que comprueba si un sitio web está en línea, si contiene un texto de control específico y si su estado ha cambiado desde la última vez que se realizó la comprobación.

## Instalación
 - Clona este repositorio: git clone https://github.com/xvrmallafre/website-checker.git
 - Navega hasta el directorio del proyecto: cd website-checker
 - Instala las dependencias: npm install
 - Crea una base de datos en MongoDB y crea una collection en ella.

## Uso
Para utilizar Site Checker, simplemente ejecuta el comando `node index.js` desde el directorio del proyecto. Esto iniciará la aplicación y comenzará a comprobar el sitio web configurado en el archivo .env.

## Configuración
Site Checker se puede configurar mediante variables de entorno o editando el archivo .env.
En el proyecto clonado, consta un archivo `.env.default` con todos los valores necesarios para funcionar.

A continuación se describe cada uno de ellos:
 - `MONGODB_URI`: Cadena de conexión de MongoDB.
 - `MONGODB_NAME`: Nombre de la base de datos de MongoDB que se utilizará. 
 - `MONGODB_COLLECTION`: Nombre de la collection de MongoDB.
 - `URL`: Enlace de la URL que se tiene que comprobar.
 - `SEARCH_TEXT`: Texto que consta en la web para asegurar que hay contenido en el portal.
 - `BOTNAME`: Este texto se usará para que en el log de accesos podamos identificar el Bot en nuestras peticiones.
 - `TELEGRAM_TOKEN`: Token del bot de Telegram. 
 - `TELEGRAM_CHAT_ID`: ID del chat a quien el bot reportará los mensajes. Para obtener este valor mira este [enlace](https://es.macspots.com/how-find-chat-id-telegram-2404655)
 - `INTERVAL`: Tiempo en segundos entre cada comprobación.
