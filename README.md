imgタグの読み込み管理

この記事はjQueryの使用を前提に書いています。ご注意ください。zzzzzzzzz

### 課題
JavaScriptでDOMのレイアウトを操作する場合、DOM内に画像があることで思わぬバグが発生することがあります。特にサイズ指定をする場合に上手くいかないことがよくあると思います。今回はこれを解決します


### 原因
<b>「原因は画像が読み込まれる前に処理を実行する」</b>が原因です。
そのために、サイズが取得できなかったり、サイズ０で操作してしまうためです。

### 簡易な対応では問題がある
簡易な対応方法では、windowのloadがあります。

```javascript
$(window).load(function(){
	// 操作
});
```

しかしこれでは以下のような問題を抱えています。
+ 表示まで時間が掛かる
+ JSエラーが起きると完了しない。

windowのload関数は、すべての要素が読み込まれてから実行されるため、要素が多いとかなり時間を要します。2番目はSNSボタンなどで発生しやすいのでタチが悪いです。(SNSのJSなどはこちらではどうにもできないので致命的な場合があります。)
どちらも<b>「他の要素の影響をうけてしまう」</b>ことが原因です。

そこで今回別の方法で回避します。
それが、<b>画像読み込み管理クラス</b>を作るです。


### 回避方法
画像読み込み管理の方法は1つだけですが、&lt;img&gt;タグの画像読み込み管理は少し手間がかかります。
まずはImageオブジェクトの読み込み処理です。

```javascript
var image = new Image();

// コールバックを設定
img.onload = function(){
	console.log("load complete");
}

// srcに画像パスを設定することで読み込み処理が実行されます。
image.src = 'images/test.jpg';
```


次に&lt;img&gt;タグです。
ここで問題になるのは、&lt;img&gt;タグはすでにsrc属性に値が設定されているため、ほっておくと読み込みが勝手に始まり、完了しています。

ここで問題になるのが、下記のようにコールバックを設定すると上手く動かない場合があります。
たまに上手くいくから紛らわしいのんですよね...

```javascript
// コールバック設定
$('img').bind('load', function(){
	console.log("load compelete")
}
```

タイミングによっては、console.log()が動きません。
原因は<b>上記コールバックが準備される前に、&lt;img&gt;タグの画像読み込みが完了してしまう</b>ためです.

これを回避するためにはimgタグのsrc属性値を一度クリアし、読み込み開始のタイミングで再度設定します。

<b>重要なのはsrc属性にパスを設定することで、読み込みが実行されるといことです！！</b>

具体的なコードは下記のような形になります。

```javascript
$img = $('img');
$img.originSrc = $img.src;
$img.src = ""; // これで一旦クリアできます！

// コールバックを設定
$img.bind('load', function(){
   console.log("load complete");
});

// 画像読み込み開始
$img.src = $img.originSrc;
```


### ImageManagerクラスを作る

この辺りの処理をまとめて使いまわせるようにします。
さらにもう少し使いやすくするために、複数の画像の読み込みも監視します。
コードを全部載せると長くなるので、サンプルコード一式は下記のGithubでご確認ください。
[ImageManager.js](https://github.com/SuguruSasaki/image-manager-js)


実際に使うときはこれだけす。
<b>ImagerManager.watchを実行と、コールバック関数を準備する</b>、これだけす。
基本的にwatchメッソドしか使いません。これだけです。

```main.js
var _this = this;

module.ImageManager.watch($('img'), _this, onload, "引数を渡せます。");

function onload(data){
   console.log("load all complete");
   console.log(data);
}

```

複数の画像をまとめて管理する場合は、下記のようにかけます。
これで「.container」クラス内の画像を全て読み込みます。

```main_multi.js
var _this = this;

$('.container').each(function(key, value){
   var tmp = $(value).find('img');
   if(tmp[0]){
      module.ImageManager.watch(tmp, _this, onload, "引数");
   }
});

module.ImageManager.watch($('img'), _this, onload, "引数を渡せます。");

function onload(data){
   console.log("load all complete");
   console.log(data);
}

```


ImageManger.jsはObserverパターンとCommandパターンを合わせたような作りになっています。

ImageManager自体は静的クラスでしかなく、内部にImageStructクラス、CallBackクラス(Commandパターン)をインスタンス化して管理しています。


```javascript
/**
 * 画像読み込みを監視する。
 *
 * @param target
 * @param completeFunc
 * @param scope
 * @param origin
 */
module.ImageManager.watch = function(target, completeFunc, scope, origin){
    var offset = new Date().getMilliseconds();
    if(module.ImageManager.listeners[target[0].src + offset]) return;
    var struct = new ImageStruct(target, completeFunc, scope, origin);
    module.ImageManager.listeners[target[0].src] = struct;
    struct.loadImage();
    return struct;
};

/**
 * 画像読み込み構造体
 *
 * @param target
 * @param scope
 * @param compFunc
 * @param args
 * @constructor
 */
var ImageStruct = function(target, scope, compFunc, args){
    this.target = target;
    this.scope = scope;
    this.callBacks = [];
    this.addCallBack(scope, compFunc, args);
    this.counter = 0;
    this.counterMax = this.target.length;
};

/**
 * 画像読み込み
 */
ImageStruct.prototype['loadImage'] = function(){
    var _this = this;
    this.target.each(function(key, image){
        image.orginSrc = image.src;
        image.src = "";

        $(image).bind("load", function(){
            _this.counter++;
            if(_this.counter == _this.counterMax){
                //console.log("complete = ", _this.counter);
                _this.execute();
            }
        });

        image.src = image.orginSrc;
    });
};

/**
 * コールバック処理の登録
 * @param scope
 * @param func
 * @param args
 */
ImageStruct.prototype['addCallBack'] = function(scope, func, args){
    var callBack = new CallBack(scope, func, args);
    this.callBacks.push(callBack);
};

/**
 * コールバックを実行
 */
ImageStruct.prototype['execute'] = function(){
    for(var i = 0; i < this.callBacks.length; ++i){
        var callBack = this.callBacks[i];
        callBack.execute();
    }
};

/**
 * コールバックオブジェクト
 * @param scope
 * @param func
 * @param args
 * @constructor
 */
var CallBack = function(scope, func, args) {
    this.scope = scope;
    this.func = func;
    this.args = args;
}

/**
 * コールバック処理を実行
 */
CallBack.prototype['execute'] = function(){
    this.func.apply(this.scope, [this.args]);
}
```










