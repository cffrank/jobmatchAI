import asyncio
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None
    
    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()
        
        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",         # Set the browser window size
                "--disable-dev-shm-usage",        # Avoid using /dev/shm which can cause issues in containers
                "--ipc=host",                     # Use host-level IPC for better stability
                "--single-process"                # Run the browser in a single process mode
            ],
        )
        
        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        context.set_default_timeout(5000)
        
        # Open a new page in the browser context
        page = await context.new_page()
        
        # Navigate to your target URL and wait until the network request is committed
        await page.goto("http://localhost:5173", wait_until="commit", timeout=10000)
        
        # Wait for the main page to reach DOMContentLoaded state (optional for stability)
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=3000)
        except async_api.Error:
            pass
        
        # Iterate through all iframes and wait for them to load as well
        for frame in page.frames:
            try:
                await frame.wait_for_load_state("domcontentloaded", timeout=3000)
            except async_api.Error:
                pass
        
        # Interact with the page elements to simulate user flow
        # -> Input email and password, then click Sign In button
        frame = context.pages[-1]
        # Input email address
        elem = frame.locator('xpath=html/body/div/div/div/div[2]/form/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('test1@jobmatch.ai')
        

        frame = context.pages[-1]
        # Input password
        elem = frame.locator('xpath=html/body/div/div/div/div[2]/form/div[2]/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('TestPassword123!')
        

        frame = context.pages[-1]
        # Click Sign In button
        elem = frame.locator('xpath=html/body/div/div/div/div[2]/form/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Navigate to 'Applications' page to submit multiple job applications and update their statuses
        frame = context.pages[-1]
        # Click on 'Applications' button in the sidebar to manage job applications
        elem = frame.locator('xpath=html/body/div/div/aside/nav/ul/li[3]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Navigate to Tracker page to update statuses and schedule follow-ups
        frame = context.pages[-1]
        # Click on 'Tracker' button in sidebar to update application statuses and schedule follow-ups
        elem = frame.locator('xpath=html/body/div/div/aside/nav/ul/li[4]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Click 'New Application' button to start submitting new job applications
        frame = context.pages[-1]
        # Click 'New Application' button to submit new job applications
        elem = frame.locator('xpath=html/body/div/div/main/div/div/div/div/div[2]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Navigate to Analytics page to verify if current metrics reflect the existing application data before adding new applications
        frame = context.pages[-1]
        # Click on 'Analytics' button in sidebar to access analytics dashboard
        elem = frame.locator('xpath=html/body/div/div/aside/nav/ul/li[5]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # --> Assertions to verify final state
        frame = context.pages[-1]
        await expect(frame.locator('text=Application Analytics').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Track your job search performance and insights').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Analytics Dashboard Coming Soon').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Response Rates').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Track how often companies respond to your applications').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Time to Response').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Average time from application to first response').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Match Score Impact').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Success rates by job match score ranges').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Top Variants').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Which resume/cover letter variants perform best').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=In Development').first).to_be_visible(timeout=30000)
        await asyncio.sleep(5)
    
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()
            
asyncio.run(run_test())
    