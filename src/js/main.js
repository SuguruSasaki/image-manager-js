$(function(exports) {
    exports.sample = exports.sample || {};
    var module = exports.sample;

    var _this = this;

    module.ImageManager.watch($('img'), _this, onload, "引数を渡せます。");

    function onload(data){
        console.log("load all complete");
        console.log(data);
    }
});