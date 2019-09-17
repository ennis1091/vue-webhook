let http = require("http");
let crypto = require("crypto");
let SECRET = "123456"; //github webhook自定义的密码
let spawn = require("child_process");
function sign(body) {
  return (
    `sha1=` +
    crypto
      .createHmac("sha1", SECRET)
      .update(body)
      .digest("hex")
  );
}
let server = http.createServer(function(req, res) {
  console.log(req.method, req.url);
  if (req.method == "POST" && req.url == "/webhook") {
    let buffers = [];
    req.on("data", function(buffer) {
      buffers.push(buffer);
    });
    req.on("end", function(buffer) {
      let body = Buffer.concat(buffers);
      let event = req.header["x-gitHub-event"]; //event=push
      //github 请求来的时候，要传递请求体body，另外还会传一个signature过来,你需要验证签名对不对
      let signature = req.headers["x-hub-signature"];
      if (signature !== sign(body)) {
        return res.end("Not Allowed");
      }
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: true }));
      if (even == "push") {
        //开始部署
        let payload = JSON.parse(body);
        let child = spawn("sh", [`./${payload.repository.name}.sh`]);
        let buffer = [];
        child.stdout.on("data", function(buffer) {
          buffers.push(buffer);
        });
        child.stdout.on("end", function(buffer) {
          let log = Buffer.concat(buffers);
          console.log(log);
        });
      }
    });
  } else {
    res.end("Not Found");
  }
});
server.listen(4000, () => {
  console.log("webhook服务已经在4000端口上启动");
});
