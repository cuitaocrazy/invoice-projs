一个发票下载和统计的小程序

# invoice-download

只支持 263 邮箱, 只支持 JD 的发票邮件(支持批量 zip 邮件或单个的 pdf 邮件)

`invoice-download/.env`:

```text
MAIL_263_SID=MXQxYTVvOC40YzZ1OWk1QDli
MAIL_263_CID=TVhReFlUVnZPQzQwWXpaMU9XazFRRGxp
MAIL_263_UID=tao.cui@bjyada.com
```

三个参数在登陆 263 邮箱后, 用 dev-tools 找到.

sid 和 uid 可这请求的 url 参数里找到(uid 就是你的邮箱)

cid 在 cookies 里找到, key 像:`cid_tao.cui_bjyada.com`这样的东西

如果想改其他参数在`main.ts`里`context`进行配置

默认并发数 10, 修改可从`utils.ts`的`creatTask`函数参数修改

JD 发票下载可能会断开,默认重试 5 次, 重试间隔 0 秒,参数从`utils.ts`的`retry`函数参数修改

# invoice-statistics

不加参数计算路径为当前路径的`pdf`目录

生成的`statistics.csv`会在当前目录

演示

[![asciicast](https://asciinema.org/a/Lwh9qY5VSTbIQn7DiGcaxj4rz.svg)](https://asciinema.org/a/Lwh9qY5VSTbIQn7DiGcaxj4rz)
