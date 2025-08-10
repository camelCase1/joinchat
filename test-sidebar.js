import { chromium } from 'playwright';
import fs from 'fs';

async function testChannelSidebar() {
  console.log('Starting channel sidebar test...');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Step 1: Navigate to the application
    console.log('1. Navigating to http://localhost:3000');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // Take initial screenshot
    await page.screenshot({ path: 'test-screenshots/sidebar-01-initial.png', fullPage: true });
    console.log('Screenshot saved: sidebar-01-initial.png');
    
    // Step 2: Continue as guest
    console.log('2. Clicking "Continue as @guest" button...');
    
    // Wait for the guest button to be visible and click it
    const guestButton = page.locator('button:has-text("Continue as @guest")');
    await guestButton.waitFor({ state: 'visible', timeout: 10000 });
    await guestButton.click();
    console.log('Clicked guest button');
    
    // Wait for navigation or modal to appear
    await page.waitForTimeout(3000);
    
    // Look for guest username input specifically
    const usernameInput = page.locator('input#guest-username');
    if (await usernameInput.isVisible({ timeout: 2000 })) {
      console.log('Found username input, entering "TestUser"');
      await usernameInput.fill('TestUser');
      
      // Look for "Join as Guest" button specifically
      const continueButton = page.locator('button:has-text("Join as Guest")');
      if (await continueButton.isVisible({ timeout: 2000 })) {
        await continueButton.click();
        console.log('Clicked continue button');
      }
    }
    
    // Wait for chat interface to load
    console.log('3. Waiting for chat interface to load...');
    await page.waitForTimeout(5000);
    
    // Take screenshot after login
    await page.screenshot({ path: 'test-screenshots/sidebar-02-logged-in.png', fullPage: true });
    console.log('Screenshot saved: sidebar-02-logged-in.png');
    
    // Step 3: Test channel sidebar
    console.log('4. Testing channel sidebar...');
    
    // Look for sidebar or channel list
    const sidebarSelectors = [
      '[data-testid="sidebar"]',
      '[class*="sidebar"]',
      '[class*="channel"]',
      'aside',
      'nav'
    ];
    
    let sidebar = null;
    for (const selector of sidebarSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 1000 })) {
          sidebar = element;
          console.log(`Found sidebar with selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    if (sidebar) {
      // Take a focused screenshot of the sidebar
      const sidebarBox = await sidebar.boundingBox();
      if (sidebarBox) {
        await page.screenshot({ 
          path: 'test-screenshots/sidebar-03-sidebar-focused.png', 
          clip: sidebarBox 
        });
        console.log('Screenshot saved: sidebar-03-sidebar-focused.png');
      }
    }
    
    // Look for channel elements with various selectors
    const channelSelectors = [
      'button:has-text("#")',
      'a:has-text("#")',
      '[data-testid*="channel"]',
      '[class*="channel"]',
      'button[class*="room"]',
      'a[class*="room"]'
    ];
    
    let foundChannels = [];
    
    for (const selector of channelSelectors) {
      try {
        const channels = await page.locator(selector).all();
        for (const channel of channels) {
          if (await channel.isVisible({ timeout: 500 })) {
            const text = await channel.textContent();
            if (text && text.trim()) {
              foundChannels.push({ element: channel, text: text.trim(), selector });
              console.log(`Found channel: "${text.trim()}" with selector: ${selector}`);
            }
          }
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    if (foundChannels.length === 0) {
      console.log('No channels found with specific selectors, looking for any clickable elements...');
      
      // Look for any clickable elements that might be channels
      const clickableElements = await page.locator('button, a, [role="button"]').all();
      console.log(`Found ${clickableElements.length} clickable elements`);
      
      for (let i = 0; i < Math.min(20, clickableElements.length); i++) {
        const element = clickableElements[i];
        try {
          const text = await element.textContent();
          const isVisible = await element.isVisible();
          if (text && text.trim() && isVisible && text.length < 50) {
            console.log(`  - "${text.trim()}"`);
            if (text.includes('#') || text.includes('general') || text.includes('random')) {
              foundChannels.push({ element, text: text.trim(), selector: 'generic' });
            }
          }
        } catch (e) {
          // Skip this element
        }
      }
    }
    
    // Test unread indicators
    console.log('5. Testing unread indicators...');
    
    // Look for unread indicators (dots, badges, numbers)
    const unreadSelectors = [
      '[class*="unread"]',
      '[class*="badge"]',
      '[class*="dot"]',
      '.bg-red-500',
      '.bg-blue-500',
      '[data-testid*="unread"]',
      'span:has-text("0")',
      'span:has-text("1")',
      'span:has-text("2")'
    ];
    
    for (const selector of unreadSelectors) {
      try {
        const elements = await page.locator(selector).all();
        for (const element of elements) {
          if (await element.isVisible({ timeout: 500 })) {
            const text = await element.textContent();
            console.log(`Found unread indicator: "${text}" with selector: ${selector}`);
            
            // Highlight this element for screenshot
            await element.evaluate(el => {
              el.style.border = '3px solid red';
              el.style.backgroundColor = 'yellow';
            });
          }
        }
      } catch (e) {
        // Continue
      }
    }
    
    // Take final screenshot with highlighted unread indicators
    await page.screenshot({ path: 'test-screenshots/sidebar-04-unread-indicators.png', fullPage: true });
    console.log('Screenshot saved: sidebar-04-unread-indicators.png');
    
    // Try clicking on channels if found
    for (let i = 0; i < Math.min(3, foundChannels.length); i++) {
      const channel = foundChannels[i];
      console.log(`6.${i + 1} Testing channel: ${channel.text}`);
      
      try {
        await channel.element.click();
        await page.waitForTimeout(2000);
        
        await page.screenshot({ 
          path: `test-screenshots/sidebar-05-channel-${i + 1}.png`, 
          fullPage: true 
        });
        console.log(`Screenshot saved: sidebar-05-channel-${i + 1}.png`);
      } catch (e) {
        console.log(`Failed to click channel ${channel.text}:`, e.message);
      }
    }
    
    console.log('Channel sidebar test completed successfully!');
    
  } catch (error) {
    console.error('Error during test:', error);
    await page.screenshot({ path: 'test-screenshots/sidebar-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

// Create screenshots directory
if (!fs.existsSync('test-screenshots')) {
  fs.mkdirSync('test-screenshots');
}

testChannelSidebar();