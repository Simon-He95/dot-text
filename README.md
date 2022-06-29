## Dot Text
[live demo](https://dot-text.hejian.club/)
可以在线输入,查看效果

## 功能
一个简单的文字转换为点阵的形式组件

## 参数
- `text`: 文字
- `fontSize`: 字体大小
- `color`: 字体颜色
- `fontWeight`: 字体粗细
-  clear: 是否清除点阵 :(clearCanvas) => clearCanvans()

## 使用方法
```js
// main.ts
import { DotText } from 'dot-text'
app.component('DotText', DotText)
```
```html
// .vue
    <dot-text text="Hi,Simon" color="grey" font-size="50" font-weight="10" ma />
```
