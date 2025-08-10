const { chromium } = require('playwright');

async function inspectSidebar() {
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
      
      // Handle username modal
      const usernameInput = await page.$('input[placeholder*="your_username"]');
      const joinButton = await page.$('button:has-text("Join as Guest")');
      
      if (usernameInput && joinButton) {
        await usernameInput.fill('test_user_123');
        await joinButton.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(5000); // Wait longer for channels to load
        
        // Wait for specific channel elements to be visible
        await page.waitForSelector('text=introductions', { timeout: 10000 });
      }
    }

    // Take screenshot
    await page.screenshot({ path: 'channel-inspection.png' });

    // Look for channel-related elements containing "0"
    console.log('\n=== LOOKING FOR ELEMENTS WITH "0" ===');
    
    // Search the entire page for elements containing exactly "0"
    const allElements = await page.$$('*');
    let zeroCount = 0;
    
    for (let i = 0; i < allElements.length; i++) {
      const element = allElements[i];
      try {
        const textContent = await element.textContent();
        if (textContent && textContent.trim() === '0') {
          zeroCount++;
          const tagName = await element.evaluate(el => el.tagName);
          const className = await element.evaluate(el => el.className);
          const outerHTML = await element.evaluate(el => el.outerHTML);
          const parentHTML = await element.evaluate(el => el.parentElement ? el.parentElement.outerHTML.substring(0, 200) : 'No parent');
          
          console.log(`\n=== ZERO ELEMENT #${zeroCount} ===`);
          console.log('Tag:', tagName);
          console.log('Class:', className);
          console.log('HTML:', outerHTML);
          console.log('Parent (first 200 chars):', parentHTML);
          console.log('============================');
        }
      } catch (e) {
        // Skip elements that can't be accessed
      }
    }
    
    console.log(`\nTotal "0" elements found: ${zeroCount}`);
    
    // Also look for the channel list specifically
    console.log('\n=== LOOKING FOR CHANNEL NAMES ===');
    const channelNames = ['introductions', 'design', 'general', 'random', 'memes', 'tech-talk', 'product'];
    
    for (const name of channelNames) {
      const elements = await page.$$(`text=${name}`);
      console.log(`\n--- Channel "${name}" (${elements.length} elements) ---`);
      
      for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        try {
          const parentHTML = await element.evaluate(el => el.parentElement ? el.parentElement.outerHTML : 'No parent');
          console.log(`Parent HTML (${i+1}):`, parentHTML.substring(0, 300), '...');
        } catch (e) {
          console.log('Could not get parent HTML');
        }
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

inspectSidebar().catch(console.error);