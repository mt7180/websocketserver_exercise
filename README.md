# websocket server exercise

Server-based web application with WebSocket server and client using nodeJS and the socket.io library.

The library "Timeline" available from vis.js was used to display the ip-addresses of the last 10 visitors of the website. As soon as a client connects to the server, it is displayed (for all clients) at the time of connection with its ip address as an item in the timeline and as soon as it leaves the website, the duration of stay of the client (range from start to end) is displayed with its IP address for all others.