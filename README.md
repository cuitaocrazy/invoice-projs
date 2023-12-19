一个发票下载和统计的小程序

# invoice-download

只支持 263 邮箱, 只支持 JD 的发票邮件(支持批量 zip 邮件或单个的 pdf 邮件)

`main.ts`:

```javascript
const sid = "XXXXXX";
const cid = "XXXXXX";
const uid = "XXX@XXX.XXX";
```

三个参数在登陆 263 邮箱后, 用 dev-tools 找到.

sid 和 uid 可这请求的 url 参数里找到(uid 就是你的邮箱)

cid 在 cookies 里找到, key 像:`cid_tao.cui_bjyada.com`这样的东西

如果想改其他参数在`main.ts`里`context`进行配置

默认并发数 10, 修改可从`utils.ts`的`creatTask`函数参数修改

默认重试参数从`utils.ts`的`retry`函数参数修改
