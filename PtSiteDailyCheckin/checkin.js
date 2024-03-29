/*
PT站每日签到
@wurzziyoon
update：2024/02/18
0 0 1 * * * checkin.js

*/

// export PT_DAILY_CHECKIN_PROXY        若需要签到走代理请配置该项(e.g. http://192.168.xx.xx:8088）
// export PT_DAILY_CHECKIN_OCR_SERVER   hdsky验证码解析接口(e.g. http://192.168.xx.xx:8094）
// export PT_DAILY_CHECKIN_CK_HDSKY     hdsky站cookie
// export PT_DAILY_CHECKIN_CK_SOULVOICE 聆音站cookie
// export PT_DAILY_CHECKIN_CK_CARPT     carpt站cookie

const $ = new Env('PtSiteDailyCheckin');
const request = require('request');
const notify = $.isNode() ? require('../sendNotify') : '';

const RETRY_TIMES=3;

const supportCheckinList=[
    {
        "name":"hdsky",
        "url":"hdsky.me",
        "retryTimes":RETRY_TIMES,
        "action":async function(obj){
            return new Promise((resolve,reject) => {
                if(!checkRetryTimes(obj)){
                    reject(`[${obj.name}] Checkin failed!Check in exceeded retry count!`);
                }
                //generate image code
                //https://hdsky.me/image_code_ajax.php  POST
                //application/x-www-form-urlencoded; charset=UTF-8
                //request: action=new
                //response: {"success": true,"code": "fc3435f28da408f25f328385f3168883"}
                const options = {
                "url": `https://hdsky.me/image_code_ajax.php`,
                "method":"POST",
                "async":false,
                "headers": {
                    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                    "Cookie": obj.cookie,
                    "Referer": "https://hdsky.me/index.php",
                    "User-Agent":  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
                    },
                    "body": "action=new"
                };
                request(setOptions(options), (err, resp, data) => {
                    let result="";
                    try {
                        if (err) {                        
                            reject(`[${obj.name}] Checkin(Get Image) failed! ${JSON.stringify(err)}`);
                        } else {
                            data=JSON.parse(data);
                            if(data.success){
                                resolve(data.code);
                            }else{
                                reject(`[${obj.name}] Checkin(Get Image) failed! ${JSON.stringify(data)}`);
                            }
                        }
                    } catch (e) {
                        reject(`[${obj.name}] Checkin failed! ${JSON.stringify(e)}`);
                    } 
                });
            }).then((imageHash)=>{
                return new Promise((ihResolve,ihReject) => {
                    const imageUrl=`https://hdsky.me/image.php?action=regimage&imagehash=${imageHash}`;
                                //console.log(imagehash);
                                result=imageUrl;
                                const getCodeOptions = {
                                    "url": `/ocr/ddddocr/url/text`,
                                    "method":"POST",
                                    "async":false,
                                    "headers": {
                                        "Content-Type": "text/plain",
                                        "Preprocessing":"1",
                                        "User-Agent":  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
                                        },
                                    "body": imageUrl,
                                };
                    setOptions(getCodeOptions);
                    getCodeOptions.url= `${getCodeOptions.ocrServer}${getCodeOptions.url}`;
                    request(getCodeOptions , (err, resp, data) => {
                        //console.debug(data);
                         if (err) {         
                            ihReject(`[${obj.name}] Checkin(Get Image Code) failed! ${JSON.stringify(err)}`);
                        }
                        else{
                            ihResolve({"imageHash":imageHash,"imageCode":data});
                        }
                    });
                });
            }).then((data)=>{
                return new Promise((ciResolve,ciReject) => {
                    const checkInOptions = {
                        "url": `https://hdsky.me/showup.php`,
                        "method":"POST",
                        "async":false,
                        "headers": {
                            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                            "Cookie": obj.cookie,
                            "Referer": "https://hdsky.me/index.php",
                            "User-Agent":  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
                            },
                            "body": `action=showup&imagehash=${data.imageHash}&imagestring=${data.imageCode}`
                    };
                    
                    request(setOptions(checkInOptions), (err, resp, data) => {
                        //console.log(checkInOptions.body,data)
                        if (err) {         
                            ciReject(`[${obj.name}] Checkin(Get Image Code) failed! ${JSON.stringify(err)}`);
                        }
                        else{
                            data=JSON.parse(data);
                            if(data.success){
                                ciResolve(`[${obj.name}] Checkin successfully!`);                                                    
                            }
                            else{
                                if(data.message === "invalid_imagehash"){
                                    obj.retryTimes = obj.retryTimes-1;
                                    console.log(`[${obj.name}] Checkin(Checkin) failed! Starting checkin again (${obj.retryTimes})...`);
                                    return obj.action(obj);
                                }
                                else{
                                    ciResolve(`[${obj.name}] Checkin(Checkin) failed!${JSON.stringify(data)}`);
                                }
                            }
                        }
                    });
                });
            }).catch(e=>{
                console.log(e);
                return e;
            })
        }
    },
    {
        "name":"soulvoice",
        "url":"pt.soulvoice.club",
        "retryTimes":RETRY_TIMES,
        "action":async function(obj){
            //https://pt.soulvoice.club/attendance.php
            return new Promise((resolve,reject) => {
                if(!checkRetryTimes(obj)){
                    reject(`[${obj.name}] Checkin failed!Check in exceeded retry count!`);
                }
                const options = {
                "url": `https://pt.soulvoice.club/attendance.php`,
                "method":"GET",
                "headers": {
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                    "Accept-Encoding": "gzip, deflate, br",
                    "Accept-Language": "zh-CN,zh;q=0.9",
                    "Cookie": obj.cookie,
                    "Referer": "https://pt.soulvoice.club/torrents.php",
                    "User-Agent":  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
                    "Upgrade-Insecure-Requests":  "1"
                    },
                };
                
                request(setOptions(options), (err, resp, data) => {
                    try {
                        if (err) {                        
                            resolve(`[${obj.name}] Checkin failed! ${JSON.stringify(err)}`);
                        } else {
                            resolve(`[${obj.name}] Checkin successfully!`);
                        }
                    } catch (e) {
                        reject(`[${obj.name}] Checkin failed! ${JSON.stringify(e)}`);
                    } 
                });}
            );
        
        }
    },
    {
        "name":"carpt",
        "url":"carpt.net",
        "retryTimes":RETRY_TIMES,
        "action":async function(obj){
            //https://carpt.net/attendance.php
            return new Promise((resolve,reject) => {
                if(!checkRetryTimes(obj)){
                    reject(`[${obj.name}] Checkin failed!Check in exceeded retry count!`);
                }
                const options = {
                "url": `https://carpt.net/attendance.php`,
                "headers": {
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                    "Accept-Encoding": "gzip, deflate, br",
                    "Accept-Language": "zh-cn",
                    "Connection": "keep-alive",
                    "Cookie": obj.cookie,
                    "Referer": "https://carpt.net/torrents.php",
                    "User-Agent":  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
                    }
                };
                request(setOptions(options), (err, resp, data) => {
                    try {
                        if (err) {                        
                            resolve(`[${obj.name}] Checkin failed! ${JSON.stringify(err)}`);
                        } else {
                            resolve(`[${obj.name}] Checkin successfully!`);
                        }
                    } catch (e) {
                        reject(`[${obj.name}] Checkin failed! ${JSON.stringify(e)}`);
                    } 
                });
            });
        }
    },
];
const allConfig=process.env;
const ENV_CONFIG_PREFIX="PT_DAILY_CHECKIN_CK_";

(async ()=>{
    let checkinResult="";
    for(let configItem in allConfig){
        if(configItem.toLocaleLowerCase().startsWith(ENV_CONFIG_PREFIX.toLocaleLowerCase())){
            const taskName=configItem.substring(ENV_CONFIG_PREFIX.length).toLocaleLowerCase();
            const checkinItem = supportCheckinList.filter(t=>t.name === taskName);
            if(checkinItem){
                checkinItem[0].cookie=allConfig[configItem];
                //console.log(checkinItem[0])
                checkinResult += `${await checkin(checkinItem[0])}<br/><br/><br/>`;
            }
            
        }
    }

    console.log(checkinResult);
    notify.sendNotify(`PT站每日签到`, checkinResult);

})();

async function checkin(obj){
    return await obj.action(obj);    
}

function checkRetryTimes(obj){
    if(obj && obj.retryTimes != undefined && obj.retryTimes<0){
        return  false;
    }
    return true;
}

function setOptions(options){
    if(allConfig["PT_DAILY_CHECKIN_PROXY"]){
        options.proxy=allConfig["PT_DAILY_CHECKIN_PROXY"];
    }
    if(allConfig["PT_DAILY_CHECKIN_OCR_SERVER"]){
        options.ocrServer=allConfig["PT_DAILY_CHECKIN_OCR_SERVER"];
    }
    return options;
}

function Env(t, e) { "undefined" != typeof process && JSON.stringify(process.env).indexOf("GITHUB") > -1 && process.exit(0); class s { constructor(t) { this.env = t } send(t, e = "GET") { t = "string" == typeof t ? { url: t } : t; let s = this.get; return "POST" === e && (s = this.post), new Promise((e, i) => { s.call(this, t, (t, s, r) => { t ? i(t) : e(s) }) }) } get(t) { return this.send.call(this.env, t) } post(t) { return this.send.call(this.env, t, "POST") } } return new class { constructor(t, e) { this.name = t, this.http = new s(this), this.data = null, this.dataFile = "box.dat", this.logs = [], this.isMute = !1, this.isNeedRewrite = !1, this.logSeparator = "\n", this.startTime = (new Date).getTime(), Object.assign(this, e), this.log("", `🔔${this.name}, 开始!`) } isNode() { return "undefined" != typeof module && !!module.exports } isQuanX() { return "undefined" != typeof $task } isSurge() { return "undefined" != typeof $httpClient && "undefined" == typeof $loon } isLoon() { return "undefined" != typeof $loon } toObj(t, e = null) { try { return JSON.parse(t) } catch { return e } } toStr(t, e = null) { try { return JSON.stringify(t) } catch { return e } } getjson(t, e) { let s = e; const i = this.getdata(t); if (i) try { s = JSON.parse(this.getdata(t)) } catch { } return s } setjson(t, e) { try { return this.setdata(JSON.stringify(t), e) } catch { return !1 } } getScript(t) { return new Promise(e => { this.get({ url: t }, (t, s, i) => e(i)) }) } runScript(t, e) { return new Promise(s => { let i = this.getdata("@chavy_boxjs_userCfgs.httpapi"); i = i ? i.replace(/\n/g, "").trim() : i; let r = this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout"); r = r ? 1 * r : 20, r = e && e.timeout ? e.timeout : r; const [o, h] = i.split("@"), n = { url: `http://${h}/v1/scripting/evaluate`, body: { script_text: t, mock_type: "cron", timeout: r }, headers: { "X-Key": o, Accept: "*/*" } }; this.post(n, (t, e, i) => s(i)) }).catch(t => this.logErr(t)) } loaddata() { if (!this.isNode()) return {}; { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), i = !s && this.fs.existsSync(e); if (!s && !i) return {}; { const i = s ? t : e; try { return JSON.parse(this.fs.readFileSync(i)) } catch (t) { return {} } } } } writedata() { if (this.isNode()) { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), i = !s && this.fs.existsSync(e), r = JSON.stringify(this.data); s ? this.fs.writeFileSync(t, r) : i ? this.fs.writeFileSync(e, r) : this.fs.writeFileSync(t, r) } } lodash_get(t, e, s) { const i = e.replace(/\[(\d+)\]/g, ".$1").split("."); let r = t; for (const t of i) if (r = Object(r)[t], void 0 === r) return s; return r } lodash_set(t, e, s) { return Object(t) !== t ? t : (Array.isArray(e) || (e = e.toString().match(/[^.[\]]+/g) || []), e.slice(0, -1).reduce((t, s, i) => Object(t[s]) === t[s] ? t[s] : t[s] = Math.abs(e[i + 1]) >> 0 == +e[i + 1] ? [] : {}, t)[e[e.length - 1]] = s, t) } getdata(t) { let e = this.getval(t); if (/^@/.test(t)) { const [, s, i] = /^@(.*?)\.(.*?)$/.exec(t), r = s ? this.getval(s) : ""; if (r) try { const t = JSON.parse(r); e = t ? this.lodash_get(t, i, "") : e } catch (t) { e = "" } } return e } setdata(t, e) { let s = !1; if (/^@/.test(e)) { const [, i, r] = /^@(.*?)\.(.*?)$/.exec(e), o = this.getval(i), h = i ? "null" === o ? null : o || "{}" : "{}"; try { const e = JSON.parse(h); this.lodash_set(e, r, t), s = this.setval(JSON.stringify(e), i) } catch (e) { const o = {}; this.lodash_set(o, r, t), s = this.setval(JSON.stringify(o), i) } } else s = this.setval(t, e); return s } getval(t) { return this.isSurge() || this.isLoon() ? $persistentStore.read(t) : this.isQuanX() ? $prefs.valueForKey(t) : this.isNode() ? (this.data = this.loaddata(), this.data[t]) : this.data && this.data[t] || null } setval(t, e) { return this.isSurge() || this.isLoon() ? $persistentStore.write(t, e) : this.isQuanX() ? $prefs.setValueForKey(t, e) : this.isNode() ? (this.data = this.loaddata(), this.data[e] = t, this.writedata(), !0) : this.data && this.data[e] || null } initGotEnv(t) { this.got = this.got ? this.got : require("got"), this.cktough = this.cktough ? this.cktough : require("tough-cookie"), this.ckjar = this.ckjar ? this.ckjar : new this.cktough.CookieJar, t && (t.headers = t.headers ? t.headers : {}, void 0 === t.headers.Cookie && void 0 === t.cookieJar && (t.cookieJar = this.ckjar)) } get(t, e = (() => { })) { t.headers && (delete t.headers["Content-Type"], delete t.headers["Content-Length"]), this.isSurge() || this.isLoon() ? (this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, { "X-Surge-Skip-Scripting": !1 })), $httpClient.get(t, (t, s, i) => { !t && s && (s.body = i, s.statusCode = s.status), e(t, s, i) })) : this.isQuanX() ? (this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: !1 })), $task.fetch(t).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => e(t))) : this.isNode() && (this.initGotEnv(t), this.got(t).on("redirect", (t, e) => { try { if (t.headers["set-cookie"]) { const s = t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString(); s && this.ckjar.setCookieSync(s, null), e.cookieJar = this.ckjar } } catch (t) { this.logErr(t) } }).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => { const { message: s, response: i } = t; e(s, i, i && i.body) })) } post(t, e = (() => { })) { if (t.body && t.headers && !t.headers["Content-Type"] && (t.headers["Content-Type"] = "application/x-www-form-urlencoded"), t.headers && delete t.headers["Content-Length"], this.isSurge() || this.isLoon()) this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, { "X-Surge-Skip-Scripting": !1 })), $httpClient.post(t, (t, s, i) => { !t && s && (s.body = i, s.statusCode = s.status), e(t, s, i) }); else if (this.isQuanX()) t.method = "POST", this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: !1 })), $task.fetch(t).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => e(t)); else if (this.isNode()) { this.initGotEnv(t); const { url: s, ...i } = t; this.got.post(s, i).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => { const { message: s, response: i } = t; e(s, i, i && i.body) }) } } time(t, e = null) { const s = e ? new Date(e) : new Date; let i = { "M+": s.getMonth() + 1, "d+": s.getDate(), "H+": s.getHours(), "m+": s.getMinutes(), "s+": s.getSeconds(), "q+": Math.floor((s.getMonth() + 3) / 3), S: s.getMilliseconds() }; /(y+)/.test(t) && (t = t.replace(RegExp.$1, (s.getFullYear() + "").substr(4 - RegExp.$1.length))); for (let e in i) new RegExp("(" + e + ")").test(t) && (t = t.replace(RegExp.$1, 1 == RegExp.$1.length ? i[e] : ("00" + i[e]).substr(("" + i[e]).length))); return t } msg(e = t, s = "", i = "", r) { const o = t => { if (!t) return t; if ("string" == typeof t) return this.isLoon() ? t : this.isQuanX() ? { "open-url": t } : this.isSurge() ? { url: t } : void 0; if ("object" == typeof t) { if (this.isLoon()) { let e = t.openUrl || t.url || t["open-url"], s = t.mediaUrl || t["media-url"]; return { openUrl: e, mediaUrl: s } } if (this.isQuanX()) { let e = t["open-url"] || t.url || t.openUrl, s = t["media-url"] || t.mediaUrl; return { "open-url": e, "media-url": s } } if (this.isSurge()) { let e = t.url || t.openUrl || t["open-url"]; return { url: e } } } }; if (this.isMute || (this.isSurge() || this.isLoon() ? $notification.post(e, s, i, o(r)) : this.isQuanX() && $notify(e, s, i, o(r))), !this.isMuteLog) { let t = ["", "==============📣系统通知📣=============="]; t.push(e), s && t.push(s), i && t.push(i), console.log(t.join("\n")), this.logs = this.logs.concat(t) } } log(...t) { t.length > 0 && (this.logs = [...this.logs, ...t]), console.log(t.join(this.logSeparator)) } logErr(t, e) { const s = !this.isSurge() && !this.isQuanX() && !this.isLoon(); s ? this.log("", `❗️${this.name}, 错误!`, t.stack) : this.log("", `❗️${this.name}, 错误!`, t) } wait(t) { return new Promise(e => setTimeout(e, t)) } done(t = {}) { const e = (new Date).getTime(), s = (e - this.startTime) / 1e3; this.log("", `🔔${this.name}, 结束! 🕛 ${s} 秒`), this.log(), (this.isSurge() || this.isQuanX() || this.isLoon()) && $done(t) } }(t, e) }