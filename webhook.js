let http = require("http");
let crypto = require("crypto");
let SECRET = "123456"; //github webhook自定义的密码
let { spawn } = require("child_process");
let sendMail = require("./sendMail"); //发送邮件
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
      let event = req.headers["x-github-event"] || req.headers["x-gitee-event"]; //event=push
      //github 请求来的时候，要传递请求体body，另外还会传一个signature过来,你需要验证签名对不对
      if (req.headers["user-agent"] === "git-oschina-hook") {
        //gitee
        console.log("--- Gitee 平台 ---");
        // SECRET是在config.js中配置了
        if (req.headers["x-gitee-token"] === SECRET) {
          if (event === "Push Hook") {
            console.log("--- push 任务命中 ---");
            let payload = JSON.parse(body);
            console.log(
              `--- 任务名称: ${payload.repository.name}, 路径: ${payload.repository.path} ---`
            );
            // 开启子进程执行对应的脚本
            // payload.repository.path 是gitee/github传来的repo的路径
            // 通过path的值执行sh目录下对应的脚本
            // 比如项目名字叫web_hook path的值就是web_hook
            // 执行的脚本就是./sh/web_hook.sh
            let child = spawn("sh", [`./sh/${payload.repository.name}.sh`]);
            // 接收子进程传来的数据
            let buffers = [];
            child.stdout.on("data", buffer => {
              console.log(`--- 接受data ${buffer.toString()} ---`);
              buffers.push(buffer);
            });
            child.stdout.on("end", () => {
              let logs = Buffer.concat(buffers).toString();
              sendMail(`
                  <h1>部署日期: ${new Date()}</h1>
                  <h2>部署人: ${payload.pusher.name}</h2>
                  <h2>部署邮箱: ${payload.pusher.email}</h2>
                  <h2>提交信息: ${payload.head_commit &&
                    payload.head_commit["message"]}</h2>
                  <h2>布署日志: ${logs.replace("\r\n", "<br/>")}</h2>
              `);
            });
          }
          // 返回的json, 配置在./src/resModel中
          res.end("success");
        } else {
          // 其他的请求返回不允许
          return res.end("Not Allowed");
        }
      } else {
        let signature = req.headers["x-hub-signature"];
        if (signature !== sign(body)) {
          return res.end("Not Allowed");
        }
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ ok: true }));
        if (event == "push") {
          //开始部署
          let payload = JSON.parse(body);
          let child = spawn("sh", [`./${payload.repository.name}.sh`]);
          let buffer = [];
          child.stdout.on("data", function(buffer) {
            buffers.push(buffer);
          });
          child.stdout.on("end", function(buffer) {
            let logs = Buffer.concat(buffers).toString();
            sendMail(`
                <h1>部署日期: ${new Date()}</h1>
                <h2>部署人: ${payload.pusher.name}</h2>
                <h2>部署邮箱: ${payload.pusher.email}</h2>
                <h2>提交信息: ${payload.head_commit &&
                  payload.head_commit["message"]}</h2>
                <h2>布署日志: ${logs.replace("\r\n", "<br/>")}</h2>
            `);
          });
        }
      }
    });
  } else {
    res.end("Not Found");
  }
});
server.listen(4000, () => {
  console.log("webhook服务已经在4000端口上启动");
});
