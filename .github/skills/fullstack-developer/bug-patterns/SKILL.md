# Bug Patterns Skill

## 触发条件
- 修复 CSS 样式问题
- 修复布局跳动问题
- 修复响应式显示问题
- 修复数据精度问题

---

## 常见 Bug 模式

### 1. Inline Style 覆盖 CSS

**症状**：CSS 媒体查询不生效

**原因**：
```javascript
// 错误：JS 设置 inline style
element.style.display = 'block'; // 覆盖了 CSS @media
```

**解决**：
```javascript
// 正确：让 CSS 控制，不设置 inline style
// 或者使用 class 切换
element.classList.add('show');
element.classList.remove('show');
```

---

### 2. DOM 重建导致跳动

**症状**：点击元素时页面跳动

**原因**：
```javascript
// 错误：每次点击重建整个 DOM
function onClick() {
  renderList(); // 重建所有元素
}
```

**解决**：
```javascript
// 正确：只更新 class，不重建 DOM
function onClick() {
  document.querySelectorAll('.item').forEach(item => {
    item.classList.toggle('active', item.id === selectedId);
  });
}
```

---

### 3. Border 导致布局跳动

**症状**：hover 时元素跳动

**原因**：
```css
/* 错误：border 增加尺寸 */
.box { border: none; }
.box:hover { border: 2px solid red; } /* 尺寸变化 */
```

**解决**：
```css
/* 正确：使用 inset box-shadow */
.box { box-shadow: none; }
.box:hover { box-shadow: inset 0 0 0 2px red; }
```

---

### 4. DECIMAL 精度问题

**症状**：相同值被判为不同

**原因**：
```javascript
// 错误：字符串/DECIMAL 直接比较
if (old.price !== new.price) { ... } // "2.5" !== "2.5000"
```

**解决**：
```javascript
// 正确：转为数值比较
if (parseFloat(old.price) !== parseFloat(new.price)) { ... }
```

---

### 5. 表格详情行占用空间

**症状**：折叠的详情行仍然占用空间

**原因**：
```css
/* 错误：只有内容折叠，行本身未隐藏 */
.detail-content { max-height: 0; }
.detail-row { /* 没有隐藏 */ }
```

**解决**：
```css
/* 正确：行也隐藏 */
.detail-row { display: none; }
.detail-row.expanded { display: table-row; }
```

---

## 检查清单

修复样式问题时，检查：

- [ ] 是否有 inline style 覆盖 CSS？
- [ ] 是否有 DOM 重建导致跳动？
- [ ] 是否有 border/尺寸变化导致跳动？
- [ ] 数值比较是否处理了精度？
- [ ] 隐藏元素是否完全不占用空间？

---

## 相关文件

- `LEARNING.md` - 学习记录