import { expect, test } from '@playwright/test';

/** 跳过新手引导（若显示）：等待引导出现后再跳过，避免竞态 */
async function skipTutorial(page: import('@playwright/test').Page) {
  try {
    await page
      .getByRole('button', { name: '跳过引导' })
      .waitFor({ state: 'visible', timeout: 4000 });
    await page.getByRole('button', { name: '跳过引导' }).click();
  } catch {
    // 无引导（老玩家 tutorialStep=6），直接继续
  }
}

/** 浏览器验收：新游戏 → 首次收租 */
test('新游戏到首次收租', async ({ page }) => {
  await page.goto('/');

  // 新手引导开场
  await expect(page.getByRole('dialog', { name: '新手引导' })).toBeVisible();
  await expect(page.getByText('你在深圳有 8 套小房子')).toBeVisible();

  // 跳过引导
  await page.getByRole('button', { name: '跳过引导' }).click();

  // 顶部状态栏：第1年1月、¥24,000
  await expect(page.getByText('第1年1月')).toBeVisible();
  await expect(page.getByText('¥24,000')).toBeVisible();
  await expect(page.getByText('房产 8 套')).toBeVisible();
  await expect(page.getByText('出租 2', { exact: true })).toBeVisible();

  // 结束本月
  await page.getByRole('button', { name: '结束本月' }).click();

  // 经营月报：租金 ¥2,000
  const report = page.getByRole('dialog', { name: '经营月报' });
  await expect(report).toBeVisible();
  await expect(report.getByText('本月租金收入')).toBeVisible();
  await expect(report.getByText('¥2,000')).toBeVisible();

  // 进入下个月
  await report.getByRole('button', { name: '进入下个月' }).click();
  await expect(page.getByText('第1年2月')).toBeVisible();
});

/** 浏览器验收：买房、翻新、招租与事件选择 */
test('买房、翻新、招租和事件选择', async ({ page }) => {
  await page.goto('/');
  await skipTutorial(page);

  // --- 购房弹窗展示 ---
  await page.getByRole('button', { name: /^房产/ }).click();
  await page.getByRole('button', { name: '购买' }).first().click();

  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('数量')).toBeVisible();
  await expect(dialog.getByText('单价')).toBeVisible();
  await expect(dialog.getByText('总价')).toBeVisible();
  await expect(dialog.getByText('购买后资金')).toBeVisible();
  await expect(dialog.getByText('预计新增满租收入')).toBeVisible();
  await expect(dialog.getByText('¥6,000')).toBeVisible();

  // 初始资金 ¥24,000 最多买 4 套：5/10/50 快捷按钮禁用
  await expect(page.getByRole('button', { name: '5', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: '10', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: '50', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: '最大 (4)' })).toBeEnabled();

  // 资金不足提示
  await page.getByRole('button', { name: '最大 (4)' }).click();
  await expect(dialog.getByText('¥24,000')).toBeVisible();

  // 买 1 套
  await page.getByRole('button', { name: '1', exact: true }).click();
  await dialog.getByRole('button', { name: '确认购买' }).click();
  await expect(page.getByText('¥18,000')).toBeVisible();
  await expect(page.getByText('持有 9 / 600')).toBeVisible();

  // --- 招租 ---
  await page.getByRole('button', { name: /^经营/ }).click();
  await expect(page.getByText('自然招租')).toBeVisible();
  // 候选池：2 + ceil(9×3%) = 3 人
  await expect(page.getByText('3 人')).toBeVisible();

  await page.getByRole('button', { name: /^房产/ }).click();
  const recruitButtons = page.getByRole('button', { name: '招租' });
  expect(await recruitButtons.count()).toBeGreaterThan(0);
  await recruitButtons.first().click();

  // --- 翻新 ---
  const renovateButton = page.getByRole('button', { name: /翻新 ¥/ }).first();
  await expect(renovateButton).toBeVisible();
  await renovateButton.click();

  // --- 事件选择 ---
  await page.getByRole('button', { name: /^租客/ }).click();
  const eventCard = page.locator('.event-card').first();
  await expect(eventCard).toBeVisible();
  const countBefore = await page.locator('.event-card').count();
  const firstChoice = eventCard.locator('.event-choice').first();
  await expect(firstChoice).toBeVisible();
  await firstChoice.click();
  // 选择后事件卡片减少
  const countAfter = await page.locator('.event-card').count();
  expect(countAfter).toBeLessThan(countBefore);
});

/** 浏览器验收：刷新后恢复存档 */
test('刷新后恢复存档', async ({ page }) => {
  await page.goto('/');
  await skipTutorial(page);

  // 购买 1 套基础公寓
  await page.getByRole('button', { name: /^房产/ }).click();
  await page.getByRole('button', { name: '购买' }).first().click();
  await page.getByRole('button', { name: '1', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: '确认购买' }).click();
  await expect(page.getByText('¥18,000')).toBeVisible();

  // 刷新页面
  await page.reload();

  // 状态恢复：资金、房产数、月份
  await expect(page.getByText('¥18,000')).toBeVisible();
  await page.getByRole('button', { name: /^房产/ }).click();
  await expect(page.getByText('持有 9 / 600')).toBeVisible();
  await expect(page.getByText('第1年1月')).toBeVisible();
});

/** 浏览器验收：存档导出和导入 */
test('存档导出和导入', async ({ page }) => {
  await page.goto('/');
  await skipTutorial(page);

  // 购买 1 套房产产生可辨识状态（¥18,000 / 9 套）
  await page.getByRole('button', { name: /^房产/ }).click();
  await page.getByRole('button', { name: '购买' }).first().click();
  await page.getByRole('button', { name: '1', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: '确认购买' }).click();
  await expect(page.getByText('¥18,000')).toBeVisible();

  // 读取本地存档 JSON
  const saveJson = await page.evaluate(() => {
    return window.localStorage.getItem('landlord-little-life:save:v1');
  });
  expect(saveJson).toBeTruthy();
  const save = JSON.parse(saveJson!);
  expect(save.cashCents).toBe(1_800_000); // ¥18,000
  expect(save.propertyGroups[0].total).toBe(9);

  // 导出存档（设置页触发下载）
  await page.getByRole('button', { name: /^设置/ }).click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: '导出存档 JSON' }).click(),
  ]);
  expect(download.suggestedFilename()).toContain('.json');

  // 清除存档后刷新 → 新游戏
  await page.evaluate(() => {
    window.localStorage.removeItem('landlord-little-life:save:v1');
    window.localStorage.removeItem('landlord-little-life:save:v1:backup');
  });
  await page.reload();
  await skipTutorial(page);
  await expect(page.getByText('¥24,000')).toBeVisible();

  // 通过粘贴方式导入
  await page.getByRole('button', { name: /^设置/ }).click();
  await page.getByRole('button', { name: '粘贴文本' }).click();
  const textarea = page.locator('.import-textarea');
  await textarea.fill(saveJson!);
  await page.getByRole('button', { name: '导入存档' }).click();

  // 恢复导入的状态
  await expect(page.getByText('¥18,000')).toBeVisible();
  await page.getByRole('button', { name: /^房产/ }).click();
  await expect(page.getByText('持有 9 / 600')).toBeVisible();
});

/** 浏览器验收：终局 6 个月逻辑（调试工具填充终局状态） */
test('终局6个月逻辑', async ({ page }) => {
  await page.goto('/');
  await skipTutorial(page);

  // 使用开发调试工具填充终局状态
  await page.getByRole('button', { name: /^设置/ }).click();
  await page.getByRole('button', { name: '填充终局状态（1200套满租）' }).click();

  // 验证终局状态
  await expect(page.getByText('1,200 套')).toBeVisible();

  // 终局挑战面板出现（社区页）
  await page.getByRole('button', { name: /^社区/ }).click();
  await expect(page.getByText('温暖社区稳定经营挑战')).toBeVisible();

  // 连续结束本月 6 次 → 胜利
  for (let i = 0; i < 6; i++) {
    await page.getByRole('button', { name: '结束本月' }).click();
    const report = page.getByRole('dialog', { name: '经营月报' });
    await expect(report).toBeVisible();
    // 月报显示达标
    await expect(report.getByText(/达标/)).toBeVisible();
    await report.getByRole('button', { name: '进入下个月' }).click();
  }

  // 胜利页面
  const victory = page.getByRole('dialog', { name: '通关纪念' });
  await expect(victory).toBeVisible();
  await expect(victory.getByText('温暖社区 · 经营达成！')).toBeVisible();
  await expect(victory.getByText('累计租金收入')).toBeVisible();
  await expect(victory.getByText('继续经营')).toBeVisible();
  await expect(victory.getByText('重新开始')).toBeVisible();

  // 继续经营（6 次结算后为第1年7月）
  await victory.getByRole('button', { name: '继续经营' }).click();
  await expect(page.getByText('第1年7月')).toBeVisible();
});

/** 浏览器验收：390px 宽手机布局无横向溢出 */
test('390px 手机布局无横向溢出', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await skipTutorial(page);

  const checkNoOverflow = async () => {
    const overflow = await page.evaluate(() => {
      return {
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        bodyScrollWidth: document.body.scrollWidth,
      };
    });
    expect(overflow.scrollWidth).toBeLessThanOrEqual(390);
    expect(overflow.bodyScrollWidth).toBeLessThanOrEqual(390);
  };

  await checkNoOverflow();

  // 遍历所有页面检查溢出（tab 可能带事件角标，用前缀匹配）
  for (const tab of ['社区', '房产', '经营', '租客', '记录', '设置']) {
    await page.getByRole('button', { name: new RegExp(`^${tab}`) }).click();
    await checkNoOverflow();
  }

  // 底部导航可见
  await expect(page.locator('.tabbar')).toBeVisible();
});

/** 浏览器验收：减少动态效果设置生效 */
test('减少动态效果设置生效', async ({ page }) => {
  await page.goto('/');
  await skipTutorial(page);

  await page.getByRole('button', { name: /^设置/ }).click();
  // 开启减少动态效果
  const reducedMotionSwitch = page.getByRole('switch', { name: '减少动态效果开关' });
  await reducedMotionSwitch.click();

  const reduced = await page.evaluate(() => {
    return document.documentElement.dataset.reducedMotion;
  });
  expect(reduced).toBe('true');

  // 刷新后保持
  await page.reload();
  const reducedAfter = await page.evaluate(() => {
    return document.documentElement.dataset.reducedMotion;
  });
  expect(reducedAfter).toBe('true');
});

/** 浏览器验收：核心按钮可用键盘操作 */
test('核心按钮可用键盘操作', async ({ page }) => {
  await page.goto('/');
  await skipTutorial(page);

  // 键盘聚焦到结束本月并回车（只检查按钮元素，避免 BODY 全文误判）
  let focused = false;
  for (let i = 0; i < 60; i++) {
    const name = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el.tagName !== 'BUTTON') return '';
      return (el.getAttribute('aria-label') ?? el.textContent?.trim() ?? '') + '';
    });
    if (name.includes('结束本月')) {
      focused = true;
      break;
    }
    await page.keyboard.press('Tab');
  }
  expect(focused).toBe(true);
  await page.keyboard.press('Enter');

  // 月报出现
  await expect(page.getByRole('dialog', { name: '经营月报' })).toBeVisible();
});

/** 浏览器验收：损坏存档不崩溃并显示原因 */
test('损坏存档不崩溃', async ({ page }) => {
  await page.goto('/');
  await skipTutorial(page);

  // 写入损坏存档
  await page.evaluate(() => {
    window.localStorage.setItem(
      'landlord-little-life:save:v1',
      '{"saveVersion":1,"monthIndex":"坏数据"'
    );
  });
  await page.reload();
  await skipTutorial(page);

  // 页面不崩溃，显示正常游戏（损坏存档被忽略，回退新游戏）
  await expect(page.getByText('第1年1月')).toBeVisible();

  // 导入损坏 JSON 显示可理解的原因
  await page.getByRole('button', { name: /^设置/ }).click();
  await page.getByRole('button', { name: '粘贴文本' }).click();
  const textarea = page.locator('.import-textarea');
  await textarea.fill('{"这不是合法的json');
  await page.getByRole('button', { name: '导入存档' }).click();
  await expect(page.locator('.toast').filter({ hasText: '导入失败' })).toBeVisible();
});

/** 浏览器验收：动态 Emoji 加载失败时仍可正常使用 */
test('动态Emoji失败时仍可正常使用', async ({ page }) => {
  // 拦截所有动画 WebP 请求，模拟素材加载失败
  await page.route('**/*.webp', (route) => route.abort());

  await page.goto('/');
  await skipTutorial(page);

  // 页面正常渲染（静态 Emoji 降级）
  await expect(page.getByText('第1年1月')).toBeVisible();
  await expect(page.getByText('¥24,000')).toBeVisible();

  // 完整走一遍收租流程
  await page.getByRole('button', { name: '结束本月' }).click();
  const report = page.getByRole('dialog', { name: '经营月报' });
  await expect(report).toBeVisible();
  await expect(report.getByText('¥2,000')).toBeVisible();
  await report.getByRole('button', { name: '进入下个月' }).click();
  await expect(page.getByText('第1年2月')).toBeVisible();

  // 确认没有崩溃：控制台无未捕获异常
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  await page.getByRole('button', { name: /^房产/ }).click();
  await expect(page.getByText('购房市场')).toBeVisible();
  expect(errors).toEqual([]);
});
