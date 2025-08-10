const { chromium } = require('playwright');

async function inspectChannelButtons() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('Navigating to localhost:3000...');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Login as guest
    const guestButton = await page.$('button:has-text("Continue as @guest")');
    if (guestButton) {
      await guestButton.click();
      await page.waitForLoadState('networkidle');
      
      const usernameInput = await page.$('input[placeholder*="your_username"]');
      const joinButton = await page.$('button:has-text("Join as Guest")');
      
      if (usernameInput && joinButton) {
        await usernameInput.fill('test_user_123');
        await joinButton.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(5000); // Wait for channels to load
        
        await page.waitForSelector('text=introductions', { timeout: 10000 });
      }
    }

    // Take screenshot
    await page.screenshot({ path: 'button-inspection.png' });
    
    // Now find all buttons that contain channel names
    const channelNames = ['introductions', 'design', 'general', 'random', 'memes', 'tech-talk', 'product'];
    
    for (const name of channelNames) {
      console.log(`\n=== EXAMINING CHANNEL "${name}" ===`);
      
      // Find buttons containing the channel name
      const buttons = await page.$$(`button:has-text("${name}")`);
      
      for (let i = 0; i < buttons.length; i++) {
        const button = buttons[i];
        const outerHTML = await button.evaluate(el => el.outerHTML);
        const textContent = await button.evaluate(el => el.textContent);
        const classList = await button.evaluate(el => Array.from(el.classList));
        
        console.log(`Button ${i + 1}:`);
        console.log('Classes:', classList.join(' '));
        console.log('Text Content:', JSON.stringify(textContent));
        console.log('HTML (first 300 chars):', outerHTML.substring(0, 300) + '...');
        
        // Check if this text content contains "0"
        if (textContent && textContent.includes('0')) {
          console.log(`🔍 FOUND "0" IN TEXT CONTENT: ${textContent}`);
          
          // Let's examine child elements
          const childElements = await button.$$('*');
          console.log(`  📦 Button has ${childElements.length} child elements:`);
          
          for (let j = 0; j < childElements.length; j++) {
            const child = childElements[j];
            const childText = await child.textContent();
            const childTag = await child.evaluate(el => el.tagName.toLowerCase());
            const childClasses = await child.evaluate(el => el.className);
            
            if (childText && (childText.trim() === '0' || childText.includes('0'))) {
              console.log(`    🎯 Child ${j + 1}: <${childTag}> "${childText}" class="${childClasses}"`);
            }
          }
        }
        
        console.log('---');
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

inspectChannelButtons().catch(console.error);