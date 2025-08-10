import { chromium } from 'playwright';
import fs from 'fs';

async function testChannelSwitching() {
  console.log('Starting channel switching test...');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Step 1: Navigate to the application
    console.log('1. Navigating to http://localhost:3000');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // Take initial screenshot
    await page.screenshot({ path: 'test-screenshots/01-initial-page.png', fullPage: true });
    console.log('Screenshot saved: 01-initial-page.png');
    
    // Step 2: Continue as guest with username "TestUser"
    console.log('2. Looking for guest login option...');
    
    // Wait for page to load and look for guest/continue options
    await page.waitForTimeout(2000);
    
    // Look for username input or continue as guest button
    const usernameInput = await page.locator('input[placeholder*="username" i], input[type="text"]').first();
    if (await usernameInput.isVisible()) {
      console.log('Found username input, entering "TestUser"');
      await usernameInput.fill('TestUser');
      
      // Look for continue/submit button
      const continueButton = await page.locator('button:has-text("Continue"), button:has-text("Join"), button[type="submit"]').first();
      if (await continueButton.isVisible()) {
        await continueButton.click();
        console.log('Clicked continue button');
      }
    }
    
    // Wait for chat interface to load
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-screenshots/02-after-login.png', fullPage: true });
    console.log('Screenshot saved: 02-after-login.png');
    
    // Step 3: Test channel switching
    console.log('3. Testing channel switching...');
    
    // Look for sidebar channels
    const channels = ['#general', '#random', '#tech-talk', 'general', 'random', 'tech-talk'];
    let foundChannels = [];
    
    for (const channelName of channels) {
      const channelElement = await page.locator(`text="${channelName}"`).first();
      if (await channelElement.isVisible()) {
        foundChannels.push({ name: channelName, element: channelElement });
        console.log(`Found channel: ${channelName}`);
      }
    }
    
    if (foundChannels.length === 0) {
      console.log('No channels found, looking for any clickable elements in sidebar...');
      // Look for any clickable elements that might be channels
      const sidebarElements = await page.locator('[class*="sidebar"] button, [class*="sidebar"] a, [class*="channel"] button, [class*="room"]').all();
      console.log(`Found ${sidebarElements.length} potential channel elements`);
      
      for (let i = 0; i < Math.min(3, sidebarElements.length); i++) {
        const text = await sidebarElements[i].textContent();
        if (text && text.trim()) {
          foundChannels.push({ name: text.trim(), element: sidebarElements[i] });
          console.log(`Found potential channel: ${text.trim()}`);
        }
      }
    }
    
    // Test clicking on different channels
    for (let i = 0; i < Math.min(3, foundChannels.length); i++) {
      const channel = foundChannels[i];
      console.log(`4.${i + 1} Switching to channel: ${channel.name}`);
      
      // Get current page state before clicking
      const beforeTitle = await page.title();
      const beforeUrl = page.url();
      
      // Click the channel
      await channel.element.click();
      await page.waitForTimeout(1000);
      
      // Check if anything changed
      const afterTitle = await page.title();
      const afterUrl = page.url();
      
      console.log(`  Before: ${beforeUrl}`);
      console.log(`  After:  ${afterUrl}`);
      
      // Take screenshot
      await page.screenshot({ path: `test-screenshots/03-channel-${i + 1}-${channel.name.replace(/[^a-zA-Z0-9]/g, '')}.png`, fullPage: true });
      console.log(`Screenshot saved: 03-channel-${i + 1}-${channel.name.replace(/[^a-zA-Z0-9]/g, '')}.png`);
      
      // Check for active state indicators
      const activeChannels = await page.locator('[class*="active"], [class*="selected"], [aria-selected="true"]').all();
      console.log(`  Found ${activeChannels.length} elements with active state`);
      
      // Check for header updates
      const headerText = await page.locator('h1, h2, [class*="header"] text, [class*="title"]').first().textContent();
      console.log(`  Header text: ${headerText}`);
      
      await page.waitForTimeout(2000);
    }
    
    // Final screenshot
    await page.screenshot({ path: 'test-screenshots/04-final-state.png', fullPage: true });
    console.log('Screenshot saved: 04-final-state.png');
    
    console.log('Channel switching test completed successfully!');
    
  } catch (error) {
    console.error('Error during test:', error);
    await page.screenshot({ path: 'test-screenshots/error-screenshot.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

// Create screenshots directory
if (!fs.existsSync('test-screenshots')) {
  fs.mkdirSync('test-screenshots');
}

testChannelSwitching();