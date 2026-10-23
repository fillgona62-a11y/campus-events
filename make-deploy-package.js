/**
 * make-deploy-package.js
 * 从 server/package.json 生成部署用的根 package.json（deploy.ps1 自动调用）。
 *
 * 为什么要生成：线上目录 ~/campus-events-online 的根 package.json 只放后端依赖
 * （node server/src/index.js 从根目录跑，npm install 也装在根目录）。
 * 源码里这份在 server/package.json，且含一个本地引用依赖（campus-events: file:..）
 * 不能原样上传，所以每次部署前重新生成一份干净的。
 *
 * 注意：本文件含中文注释，但只被 node 执行（UTF-8），不会被 PowerShell 读取，
 *       因此不受 PowerShell 5.1 GBK 编码问题影响。
 */
const fs = require("fs");
const path = require("path");

const pkg = require("./server/package.json");

// 去掉本地 file: 引用依赖（线上没有这个相对路径）
for (const name of Object.keys(pkg.dependencies || {})) {
  const v = String(pkg.dependencies[name]);
  if (v.startsWith("file:")) delete pkg.dependencies[name];
}

const deployPkg = {
  name: "campus-events-online",
  version: pkg.version || "1.0.0",
  private: true,
  description: "校园活动报名系统（前后端一体部署包）",
  main: "server/src/index.js",
  scripts: { start: "node server/src/index.js" },
  dependencies: pkg.dependencies || {},
};

const out = path.join(__dirname, "deploy-package.json");
fs.writeFileSync(out, JSON.stringify(deployPkg, null, 2) + "\n");
console.log(
  "[deploy] 已生成部署 package.json（" +
    Object.keys(deployPkg.dependencies).length +
    " 个依赖）"
);
