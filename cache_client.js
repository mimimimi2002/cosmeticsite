// cache_client.js
const net = require("net");

class CacheClient {
  constructor(host = "127.0.0.1", port = 1234) {
    this.host = host;
    this.port = port;

    this.socket = net.createConnection({
      host: this.host,
      port: this.port
    });

    this.pendingRequests = [];

    this.socket.on("connect", () => {
      console.log(
        "Connected:",
        this.socket.localPort,
        "->",
        this.socket.remotePort
      );
    });


    this.socket.on("close", () => {
      console.log("Cache connection closed");
    });

    this.socket.on("error", (err) => {
      console.error("Cache server error:", err.message);
    });

    this.socket.on("data", (data) => {
      const response =  this.decodeResponse(data);
      const pending = this.pendingRequests.shift();
      if (pending) {
        pending.resolve(response);
      }
      console.log("response: ", response);
    })
  }

  encodeCommand(cmd) {
    let len = 4; // argc

    for (const arg of cmd) {
      len += 4 + Buffer.byteLength(arg);
    }

    const buffer = Buffer.alloc(4 + len);

    // request body length
    buffer.writeUInt32LE(len, 0);

    // argc
    buffer.writeUInt32LE(cmd.length, 4);

    let offset = 8;

    for (const arg of cmd) {
      const argBuffer = Buffer.from(arg);

      buffer.writeUInt32LE(argBuffer.length, offset);
      offset += 4;

      argBuffer.copy(buffer, offset);
      offset += argBuffer.length;
    }

    return buffer;
  }

  decodeResponse(data) {
    const len = data.readUInt32LE(0);
    const resCode = data.readUInt32LE(4);

    const body = data.subarray(8, 4 + len).toString("utf8");

    return {
      resCode,
      body
    }
  }

  sendRequest(cmd) {
    return new Promise((resolve, reject) => {
      // add to pending request queue
      this.pendingRequests.push({
        resolve,
        reject
      });
      const buffer = this.encodeCommand(cmd);
      this.socket.write(buffer);
    });
  }

  set(key, value) {
    return this.sendRequest(["set", key, value]);
  }

  pexpire(key, ttl) {
    return this.sendRequest(["pexpire", key, String(ttl)]);
  }

  get(key) {
    return this.sendRequest(["get", key]);
  }

  del(key) {
    return this.sendRequest(["del"], key);
  }

}

const cache = new CacheClient();

module.exports = cache;