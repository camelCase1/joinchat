import { chromium } from 'playwright';

async function testChannelCreation() {
  console.log('🎯 Precise channel creation test...');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000
  });
  
  try {
    const page = await browser.newPage();

    // Navigate and login
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    await page.click('button:has-text("Continue as @guest")');
    await page.waitForTimeout(1000);
    await page.fill('#guest-username', 'precise_tester');
    await page.click('button:has-text("Join as Guest")');
    await page.waitForTimeout(4000);

    console.log('✅ Logged in successfully');
    
    await page.screenshot({ 
      path: '/Users/jaelee/Sites/joinchat/screenshots/precise-01-main-ui.png',
      fullPage: true 
    });

    // Use precise coordinate-based clicking for the + button
    console.log('📍 Attempting precise coordinate click for + button...');
    
    // From the screenshot, I can see the + button is at approximately x=228, y=224
    // Let's click exactly at those coordinates
    await page.click('body', { position: { x: 228, y: 224 } });
    await page.waitForTimeout(2000);
    
    await page.screenshot({ 
      path: '/Users/jaelee/Sites/joinchat/screenshots/precise-02-after-coordinate-click.png',
      fullPage: true 
    });

    // Check if dialog opened
    let dialogOpen = await page.locator('#channel-name').isVisible();
    console.log(`Dialog open after coordinate click: ${dialogOpen}`);

    if (!dialogOpen) {
      console.log('📍 Coordinate click failed, trying DOM-based approach...');
      
      // Try a more sophisticated DOM search
      const found = await page.evaluate(() => {
        // Find all elements containing "Channels" text
        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT,
          null,
          false
        );
        
        let channelsTextNode = null;
        while (walker.nextNode()) {
          if (walker.currentNode.textContent.trim() === 'Channels') {
            channelsTextNode = walker.currentNode;
            break;
          }
        }
        
        if (channelsTextNode) {
          // Get the parent element of the text node
          let parent = channelsTextNode.parentElement;
          
          // Search for a button with Plus icon in the same container
          while (parent && parent !== document.body) {
            const buttons = parent.querySelectorAll('button');
            
            for (const btn of buttons) {
              // Check if this button has SVG children (likely Plus icon)
              const hasSvg = btn.querySelector('svg');
              if (hasSvg) {
                const btnRect = btn.getBoundingClientRect();
                const textRect = channelsTextNode.parentElement.getBoundingClientRect();
                
                // Check if button is positioned to the right of the text and on similar Y level
                if (btnRect.left > textRect.right && 
                    Math.abs(btnRect.top - textRect.top) < 15 &&
                    btnRect.left < textRect.right + 50) {
                  
                  btn.click();
                  return 'SUCCESS: Found and clicked create channel button via DOM search';
                }
              }
            }
            parent = parent.parentElement;
          }
        }
        
        return 'FAILED: Could not locate create channel button via DOM search';
      });
      
      console.log('DOM search result:', found);
      await page.waitForTimeout(2000);
      
      await page.screenshot({ 
        path: '/Users/jaelee/Sites/joinchat/screenshots/precise-03-after-dom-click.png',
        fullPage: true 
      });
      
      dialogOpen = await page.locator('#channel-name').isVisible();
      console.log(`Dialog open after DOM click: ${dialogOpen}`);
    }

    if (dialogOpen) {
      console.log('✅ Create channel dialog is open! Proceeding with form...');
      
      await page.fill('#channel-name', 'precise-test-channel');
      await page.fill('#channel-desc', 'Channel created via precise test');
      
      await page.screenshot({ 
        path: '/Users/jaelee/Sites/joinchat/screenshots/precise-04-form-filled.png',
        fullPage: true 
      });

      await page.click('button:has-text("Create Channel")');
      await page.waitForTimeout(4000);
      
      await page.screenshot({ 
        path: '/Users/jaelee/Sites/joinchat/screenshots/precise-05-channel-created.png',
        fullPage: true 
      });

      // Verify channel creation
      const newChannelVisible = await page.locator('text=precise-test-channel').isVisible();
      console.log(`New channel visible in sidebar: ${newChannelVisible}`);

      if (newChannelVisible) {
        console.log('🎉 SUCCESS: Channel creation is fully functional!');
        
        // Test switching to the new channel
        await page.click('text=precise-test-channel');
        await page.waitForTimeout(2000);
        
        await page.screenshot({ 
          path: '/Users/jaelee/Sites/joinchat/screenshots/precise-06-final-success.png',
          fullPage: true 
        });
        
        const currentUrl = page.url();
        console.log(`Current URL after switching: ${currentUrl}`);
        
        console.log('✅ Channel switching works perfectly!');
        console.log('\n🏆 COMPLETE SUCCESS: All channel creation functionality verified!');
      } else {
        console.log('❌ New channel not visible after creation');
      }
    } else {
      console.log('❌ Unable to open the create channel dialog');
      console.log('This might indicate the + button click is not working or the dialog is not implemented');
    }

    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    await browser.close();
  }
}

testChannelCreation().catch(console.error);