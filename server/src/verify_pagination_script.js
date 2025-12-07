const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('--- START DEBUG ---');
        // Ensure we have data
        const count = await prisma.post.count();
        console.log('Total posts in DB:', count);

        if (count < 10) {
            console.log('Not enough posts. Running seed logic inline...');
            // Create user if not exists
            let user = await prisma.user.findFirst();
            if (!user) {
                user = await prisma.user.create({
                    data: {
                        email: 'debug_' + Date.now() + '@example.com',
                        password: 'password',
                        name: 'Debug User'
                    }
                });
            }
            for (let i = 1; i <= 10; i++) {
                await prisma.post.create({
                    data: {
                        content: `Post ${i}`,
                        authorId: user.id
                    }
                });
            }
            console.log('Seeded.');
        }

        console.log('Fetching page 1 (limit 5)...');
        // Emulate backend logic
        const limit = 5;
        const p1 = await prisma.post.findMany({
            take: limit + 1,
            orderBy: [
                { createdAt: 'desc' },
                { id: 'desc' }
            ]
        });
        console.log('Page 1 raw fetched count:', p1.length);

        let nextCursor = undefined;
        let hasMore = false;
        if (p1.length > limit) {
            const nextItem = p1.pop();
            // nextCursor logic: The cursor is the item we want to start AFTER.
            // In cursor pagination, we pass the ID of the last item we HAVE as the cursor.
            // And use skip: 1.
            // So nextCursor should be the LAST item of the current page.
            nextCursor = p1[p1.length - 1].id;
            hasMore = true;
        } else {
            console.log('Not enough items for hasMore.');
        }

        console.log('Page 1 result IDs:', p1.map(p => p.id));
        console.log('Page 1 hasMore:', hasMore, 'nextCursor:', nextCursor);

        if (hasMore && nextCursor) {
            console.log('Fetching page 2 (limit 5, cursor ' + nextCursor + ')...');
            const p2 = await prisma.post.findMany({
                take: limit + 1,
                skip: 1,
                cursor: { id: nextCursor },
                orderBy: [
                    { createdAt: 'desc' },
                    { id: 'desc' }
                ]
            });
            console.log('Page 2 result IDs:', p2.map(p => p.id));
            console.log('Page 2 count:', p2.length);
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
