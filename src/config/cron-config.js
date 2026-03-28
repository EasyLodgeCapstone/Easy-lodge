const cron = require("node-cron");
const cloudinary = require("./cloudinary");

function startCleanupJob() {
    cron.schedule("0 * * * *", async () => {
        console.log("Running orphaned images cleanup...");

        const result = await cloudinary.search
            .expression("tags=temp AND uploaded_at < 1 hour_ago")
            .execute();

        for (const resource of result.resources) {
            await cloudinary.uploader.destroy(resource.public_id);
        }

        console.log(`Deleted ${result.resources.length} orphan images`);
    });
}

module.exports = startCleanupJob;