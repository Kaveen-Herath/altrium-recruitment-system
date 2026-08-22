require("dotenv").config();

const supabase = require("./supabase");

async function testStorage() {
    const { data, error } = await supabase.storage.listBuckets();

    if (error) {
        console.error("❌ Storage connection failed:");
        console.error(error.message);
        return;
    }

    const profileBucket = data.find(
        (bucket) => bucket.name === "profile-photos"
    );

    if (profileBucket) {
        console.log(
            "✅ Supabase Storage connected - profile-photos bucket found!"
        );
    } else {
        console.log(
            "⚠️ Connected to Supabase, but profile-photos bucket was not found."
        );

        console.log(
            "Buckets found:",
            data.map((bucket) => bucket.name)
        );
    }
}

testStorage();