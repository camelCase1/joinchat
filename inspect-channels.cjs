const { chromium } = require('playwright');

async function inspectChannelSidebar() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('Navigating to localhost:3002...');
    await page.goto('http://localhost:3000');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Take a screenshot to see what we have
    await page.screenshot({ path: 'initial-page.png' });
    console.log('Screenshot saved as initial-page.png');
    
    // Look for navigation links to channels/chat
    const chatLinks = await page.$$('a[href*="chat"], a[href*="room"], button:has-text("Join"), button:has-text("Enter"), a:has-text("Chat"), a:has-text("Rooms")');
    console.log(`Found ${chatLinks.length} potential chat/room links`);
    
    if (chatLinks.length > 0) {
      console.log('Clicking on first chat link...');
      await chatLinks[0].click();
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'after-navigation.png' });
      console.log('Screenshot saved as after-navigation.png');
    }
    
    // Check if we need to login
    const isLoginPage = await page.$('[data-testid="login-form"], input[type="email"]') !== null;
    
    if (isLoginPage) {
      console.log('Login page detected. Looking for guest option...');
      
      // Try to find the "Continue as @guest" button first
      const guestButton = await page.$('button:has-text("Continue as @guest")');
      if (guestButton) {
        console.log('Clicking Continue as @guest...');
        await guestButton.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
        
        // Check if guest username modal appeared
        const usernameInput = await page.$('input[placeholder*="your_username"], input[name="username"]');
        const joinButton = await page.$('button:has-text("Join as Guest")');
        
        if (usernameInput && joinButton) {
          console.log('Guest username modal detected, filling username...');
          await usernameInput.fill('test_user_123');
          await joinButton.click();
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(2000); // Wait for any redirects
        }
      } else {
        // Fallback to email/password login
        const emailInput = await page.$('input[type="email"]');
        const passwordInput = await page.$('input[type="password"]');
        
        if (emailInput && passwordInput) {
          console.log('Attempting to login with test credentials...');
          await emailInput.fill('test@example.com');
          await passwordInput.fill('password123');
          
          // Look for login button
          const loginButton = await page.$('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")');
          if (loginButton) {
            await loginButton.click();
            await page.waitForLoadState('networkidle');
          }
        }
      }
    }
    
    // Wait a bit for any async loading
    await page.waitForTimeout(3000);
    
    // Take another screenshot after potential login
    await page.screenshot({ path: 'after-login.png' });
    
    // Wait for the channels to fully load
    console.log('Waiting for channels to load...');
    try {
      await page.waitForSelector('[class*="channel"], text=introductions', { timeout: 5000 });
    } catch (e) {
      console.log('Channels might not be fully loaded, continuing...');
    }
    
    // Look for channel sidebar elements
    console.log('Looking for channel sidebar...');
    
    // Try multiple selectors for channels
    const channelSelectors = [
      '[data-testid*="channel"]',
      '[class*="channel"]',
      '[class*="sidebar"]',
      'nav',
      'aside',
      '[data-testid*="room"]',
      '[class*="room"]'
    ];
    
    let channelContainer = null;
    for (const selector of channelSelectors) {
      channelContainer = await page.$(selector);
      if (channelContainer) {
        console.log(`Found channel container with selector: ${selector}`);
        break;
      }
    }
    
    // Get the full page HTML to analyze
    const fullHTML = await page.content();
    console.log('\n=== FULL PAGE HTML (first 2000 chars) ===');
    console.log(fullHTML.substring(0, 2000));
    
    // Look specifically for any text containing "introductions", "design", etc.
    const channelKeywords = ['introductions', 'design', 'general', 'random', 'off-topic'];
    
    for (const keyword of channelKeywords) {
      const elements = await page.$$(`text=${keyword}`);
      if (elements.length > 0) {
        console.log(`\n=== Found "${keyword}" elements ===`);
        for (let i = 0; i < elements.length; i++) {
          const element = elements[i];
          const outerHTML = await element.evaluate(el => el.outerHTML);
          const parentHTML = await element.evaluate(el => el.parentElement ? el.parentElement.outerHTML : 'No parent');
          console.log(`Element ${i + 1}:`);
          console.log('HTML:', outerHTML);
          console.log('Parent HTML:', parentHTML);
          console.log('---');
        }
      }
    }
    
    // Look for elements containing "0" numbers with multiple strategies
    console.log('\n=== Looking for "0" numbers in the UI ===');
    
    // Strategy 1: Text content search
    const zeroElements1 = await page.$$('text=/^0$/');
    console.log(`Strategy 1 - Found ${zeroElements1.length} zero elements`);
    
    // Strategy 2: Look for elements that might contain badges/counts
    const zeroElements2 = await page.$$('*:has-text("0")');
    console.log(`Strategy 2 - Found ${zeroElements2.length} elements with "0"`);
    
    // Strategy 3: CSS selectors that might be badges
    const badgeElements = await page.$$('span, div, [class*="badge"], [class*="count"], [class*="unread"]');
    console.log(`Strategy 3 - Found ${badgeElements.length} potential badge elements`);
    
    // Check the content of some badge elements
    for (let i = 0; i < Math.min(badgeElements.length, 20); i++) {
      const element = badgeElements[i];
      const textContent = await element.evaluate(el => el.textContent?.trim());
      if (textContent === '0') {
        const outerHTML = await element.evaluate(el => el.outerHTML);
        const parentHTML = await element.evaluate(el => el.parentElement ? el.parentElement.outerHTML : 'No parent');
        console.log(`\nFound "0" in badge element ${i}:`);
        console.log('Text:', textContent);
        console.log('HTML:', outerHTML);
        console.log('Parent HTML:', parentHTML.substring(0, 500) + '...');
        console.log('---');
      }
    }
    
    // Also specifically look for channel list items
    console.log('\n=== Looking for channel list structure ===');
    const channelElements = await page.$$('[class*="channel"], li, a[href*="room"], [data-*="room"], [data-*="channel"]');
    console.log(`Found ${channelElements.length} potential channel elements`);
    
    // Look for the sidebar structure
    const sidebarElements = await page.$$('aside, nav, [class*="sidebar"], [class*="nav"]');
    console.log(`\n=== Found ${sidebarElements.length} sidebar elements ===`);
    
    for (let i = 0; i < Math.min(sidebarElements.length, 3); i++) {
      const element = sidebarElements[i];
      const innerHTML = await element.evaluate(el => el.innerHTML);
      console.log(`\nSidebar ${i + 1} HTML (first 1000 chars):`);
      console.log(innerHTML.substring(0, 1000));
    }
    
    // Also look for badge/number elements
    const badgeSelectors = [
      '[class*="badge"]',
      '[class*="count"]',
      '[class*="number"]',
      'span:has-text("0")'
    ];
    
    for (const selector of badgeSelectors) {
      const elements = await page.$$(selector);
      if (elements.length > 0) {
        console.log(`\n=== Found elements with selector "${selector}" ===`);
        for (let i = 0; i < Math.min(elements.length, 5); i++) {
          const element = elements[i];
          const outerHTML = await element.evaluate(el => el.outerHTML);
          const textContent = await element.evaluate(el => el.textContent);
          console.log(`Element ${i + 1}:`);
          console.log('HTML:', outerHTML);
          console.log('Text:', textContent);
          console.log('---');
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

inspectChannelSidebar().catch(console.error);