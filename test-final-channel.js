import { chromium } from 'playwright';

async function testChannelCreation() {
  console.log('🎯 Final channel creation test...');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 800
  });
  
  try {
    const page = await browser.newPage();

    // Step 1: Navigate to app
    console.log('📍 Step 1: Navigating to localhost:3000');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    await page.screenshot({ 
      path: '/Users/jaelee/Sites/joinchat/screenshots/final-01-app-loaded.png',
      fullPage: true 
    });

    // Step 2: Login as guest with correct flow
    console.log('📍 Step 2: Login as guest');
    await page.click('button:has-text("Continue as @guest")');
    await page.waitForTimeout(1000);
    
    // Fill in the guest username dialog
    await page.fill('#guest-username', 'test_channel_creator');
    await page.click('button:has-text("Join as Guest")');
    await page.waitForTimeout(3000);
    
    await page.screenshot({ 
      path: '/Users/jaelee/Sites/joinchat/screenshots/final-02-logged-in.png',
      fullPage: true 
    });
    console.log('✅ Successfully logged in');

    // Step 3: Find and click the + button next to Channels using JavaScript
    console.log('📍 Step 3: Finding and clicking + button next to Channels');
    
    const clickResult = await page.evaluate(() => {
      // Find the Channels text
      const channelsElements = Array.from(document.querySelectorAll('*')).filter(el => 
        el.textContent && el.textContent.trim() === 'Channels'
      );
      
      for (const channelsEl of channelsElements) {
        // Look for a button that's a sibling or nearby that contains a Plus icon
        let parent = channelsEl.parentElement;
        while (parent) {
          const buttons = parent.querySelectorAll('button');
          for (const btn of buttons) {
            // Check if this button has an SVG with Plus (lucide-plus or similar)
            const svg = btn.querySelector('svg');
            if (svg) {
              const rect = btn.getBoundingClientRect();
              const channelsRect = channelsEl.getBoundingClientRect();
              
              // Check if positioned to the right of Channels text and on same line
              if (rect.left > channelsRect.right && 
                  Math.abs(rect.top - channelsRect.top) < 20 &&
                  rect.left < channelsRect.right + 50) {
                btn.click();
                return 'SUCCESS: Clicked + button next to Channels';
              }
            }
          }
          parent = parent.parentElement;
          if (parent === document.body) break;
        }
      }
      return 'FAILED: Could not find + button';
    });
    
    console.log('Click result:', clickResult);
    await page.waitForTimeout(2000);
    
    await page.screenshot({ 
      path: '/Users/jaelee/Sites/joinchat/screenshots/final-03-after-plus-click.png',
      fullPage: true 
    });

    // Step 4: Check if dialog opened and fill form
    const dialogVisible = await page.locator('#channel-name').isVisible();
    console.log(`📍 Step 4: Dialog visible: ${dialogVisible}`);
    
    if (dialogVisible) {
      console.log('✅ Create channel dialog opened');
      
      await page.fill('#channel-name', 'test-channel-new');
      await page.fill('#channel-desc', 'This is a test channel for verification');
      
      await page.screenshot({ 
        path: '/Users/jaelee/Sites/joinchat/screenshots/final-04-form-filled.png',
        fullPage: true 
      });
      console.log('✅ Form filled');

      // Step 5: Click Create Channel
      console.log('📍 Step 5: Clicking Create Channel');
      await page.click('button:has-text("Create Channel")');
      await page.waitForTimeout(3000);
      
      await page.screenshot({ 
        path: '/Users/jaelee/Sites/joinchat/screenshots/final-05-after-create.png',
        fullPage: true 
      });

      // Step 6: Verify channel appears in list
      console.log('📍 Step 6: Checking if channel appears in list');
      const channelVisible = await page.locator('text=test-channel-new').isVisible();
      console.log(`New channel visible: ${channelVisible}`);
      
      if (channelVisible) {
        console.log('✅ New channel appears in sidebar');
        
        // Step 7: Click on new channel
        console.log('📍 Step 7: Clicking on new channel');
        await page.click('text=test-channel-new');
        await page.waitForTimeout(2000);
        
        await page.screenshot({ 
          path: '/Users/jaelee/Sites/joinchat/screenshots/final-06-switched-to-channel.png',
          fullPage: true 
        });
        console.log('✅ Successfully switched to new channel');

        console.log('🎉 ALL TESTS PASSED! Channel creation functionality is working correctly.');
        
        // Verify URL changed (if applicable)
        const currentUrl = page.url();
        console.log(`Current URL: ${currentUrl}`);
        
      } else {
        console.log('❌ New channel not visible in sidebar');
      }
    } else {
      console.log('❌ Create channel dialog did not open');
    }

    // Keep browser open for manual verification
    console.log('\n🔍 Keeping browser open for 15 seconds for manual verification...');
    await page.waitForTimeout(15000);

  } catch (error) {
    console.error('❌ Test failed:', error);
    
    // Take error screenshot
    try {
      await page.screenshot({ 
        path: '/Users/jaelee/Sites/joinchat/screenshots/final-error.png',
        fullPage: true 
      });
    } catch (e) {
      console.error('Could not take error screenshot:', e);
    }
  } finally {
    await browser.close();
  }
}

testChannelCreation().catch(console.error);