export async function firstMovie(page) {
    const id = await page.evaluate(async () => {
        const result = await window.ApiClient.getItems(window.ApiClient.getCurrentUserId(), { IncludeItemTypes: "Movie", Recursive: true, Limit: 1 });
        return result.Items[0].Id;
    });
    return id;
}
