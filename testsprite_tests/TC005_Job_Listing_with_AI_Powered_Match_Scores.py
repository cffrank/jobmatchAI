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
        # -> Input email and password, then click Sign In button to authenticate user
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
        

        # -> Click on 'Jobs' button to open job discovery page and load job listings
        frame = context.pages[-1]
        # Click Jobs button in navigation menu to open job discovery page
        elem = frame.locator('xpath=html/body/div/div/aside/nav/ul/li[2]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Click Filters button to open filter options and apply filters such as location, job type, and score range
        frame = context.pages[-1]
        # Click Filters button to open filter options
        elem = frame.locator('xpath=html/body/div/div/main/div/div/div/div[2]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Click Filters button to open filter options and apply filters such as location, job type, and minimum compatibility score to verify filtering accuracy and performance.
        frame = context.pages[-1]
        # Click Filters button to open filter options
        elem = frame.locator('xpath=html/body/div/div/main/div/div/div/div[2]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Apply filter for Location by entering a specific location (e.g., 'New York') and verify job listings update accordingly.
        frame = context.pages[-1]
        # Input location filter with 'New York'
        elem = frame.locator('xpath=html/body/div/div/main/div/div/div/div[3]/div/div[3]/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('New York')
        

        # -> Click 'Clear all filters' button to reset filters and verify that all job listings reappear with compatibility scores.
        frame = context.pages[-1]
        # Click 'Clear all filters' button to reset all filters
        elem = frame.locator('xpath=html/body/div/div/main/div/div/div[2]/div[2]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Click 'Back to Jobs' button to return to the job listings page and attempt to clear filters again or report the issue if the problem persists.
        frame = context.pages[-1]
        # Click 'Back to Jobs' button to return to job listings page
        elem = frame.locator('xpath=html/body/div/div/main/div/div/div[2]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Click 'Filters' button to open filter options and attempt to clear all filters again to verify full job list restoration.
        frame = context.pages[-1]
        # Click Filters button to open filter options
        elem = frame.locator('xpath=html/body/div/div/main/div/div/div/div[2]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Click 'Clear all filters' button to reset all filters and verify that all job listings reappear with compatibility scores.
        frame = context.pages[-1]
        # Click 'Clear all filters' button to reset all filters
        elem = frame.locator('xpath=html/body/div/div/main/div/div/div/div[3]/div/div[5]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # --> Assertions to verify final state
        frame = context.pages[-1]
        # Assert job matches summary text
        await expect(frame.locator('text=10 positions matched to your profile').first).to_be_visible(timeout=30000)
        # Assert presence of compatibility scores for job listings
        await expect(frame.locator('text=92% Excellent Match').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=88% Excellent Match').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=65% Potential Match').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=78% Good Match').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=71% Good Match').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=82% Good Match').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=94% Excellent Match').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=58% Potential Match').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=68% Potential Match').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=86% Excellent Match').first).to_be_visible(timeout=30000)
        # Assert job titles and companies to verify job listings display
        await expect(frame.locator('text=Senior Product Manager').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=TechFlow Inc').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Product Manager - AI/ML Products').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=InnovateLabs').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Associate Product Manager').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=StartupHub').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Director of Product Management').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Enterprise Solutions Corp').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Product Manager - Growth').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=GrowthEngine').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Technical Product Manager').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=CloudScale Systems').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Senior Product Manager - Platform').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=DataStream Analytics').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Product Manager - Mobile').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=AppVentures').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=VP of Product').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=ScaleUp Ventures').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Product Manager - Enterprise').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=B2B Solutions Inc').first).to_be_visible(timeout=30000)
        # Assert filter options text presence
        await expect(frame.locator('text=Minimum Match Score').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Any match').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=85%+ (Excellent)').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=70%+ (Good)').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=60%+ (Potential)').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Work Arrangement').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=All types').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Remote').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Hybrid').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=On-site').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Clear all filters').first).to_be_visible(timeout=30000)
        await asyncio.sleep(5)
    
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()
            
asyncio.run(run_test())
    