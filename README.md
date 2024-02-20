# PtSiteDailyCheckin
基于qinglong的PT站每日签到
*验证码解析服务基于[ocr_api_server](https://github.com/wurzziyoon/ocr_api_server),非hdsky站签到无需搭建。*

**支持站点：soulvoice,carpt,hdsky**


| 参数名 |说明  |
| --- | --- |
| PT_DAILY_CHECKIN_CK_HDSKY | hdsky站cookie |
| PT_DAILY_CHECKIN_CK_SOULVOICE| 聆音站cookie |
| PT_DAILY_CHECKIN_CK_CARPT | carpt站cookie  |
| PT_DAILY_CHECKIN_PROXY |  若需要签到走代理请配置该项(e.g. http://192.168.xx.xx:8088）|
| PT_DAILY_CHECKIN_OCR_SERVER |  若hdsky验证码解析接口(e.g. http://192.168.xx.xx:8094）|