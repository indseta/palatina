export async function library(page) {
    const result = await page.evaluate(async () => {
        const client = window.ApiClient;
        const user = client.getCurrentUserId();
        const views = await client.getUserViews({}, user);
        const items = await client.getItems(user, { IncludeItemTypes: "Movie,Series,Season,Episode", Recursive: true, SortBy: "SortName" });
        return {
            views: views.Items.map((view) => ({ id: view.Id, type: view.CollectionType })),
            items: items.Items.map((item) => ({ id: item.Id, type: item.Type, name: item.Name }))
        };
    });
    return result;
}
