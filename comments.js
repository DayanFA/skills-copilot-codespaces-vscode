// Create web server
// Load web server with express
const express = require('express');
const { randomBytes } = require('crypto');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');

// Create an express app
const app = express();

// Use body parser to parse the incoming requests
app.use(bodyParser.json());
app.use(cors());

// Create an object to store comments
const commentsByPostId = {};

// Create an endpoint to fetch comments for a post
app.get('/posts/:id/comments', (req, res) => {
    res.send(commentsByPostId[req.params.id] || []);
});

// Create an endpoint to create a comment
app.post('/posts/:id/comments', async(req, res) => {
    // Generate a random id for the comment
    const commentId = randomBytes(4).toString('hex');
    const { content } = req.body;

    // Get the comments for the post
    const comments = commentsByPostId[req.params.id] || [];

    // Add the new comment to the comments array
    comments.push({ id: commentId, content, status: 'pending' });

    // Store the comments array in the object
    commentsByPostId[req.params.id] = comments;

    // Send an event to the event bus
    await axios.post('http://event-bus-srv:4005/events', {
        type: 'CommentCreated',
        data: {
            id: commentId,
            content,
            postId: req.params.id,
            status: 'pending'
        }
    });

    res.status(201).send(comments);
});

// Create an endpoint to receive events from the event bus
app.post('/events', async(req, res) => {
    console.log('Received event', req.body.type);

    const { type, data } = req.body;

    if (type === 'CommentModerated') {
        const { id, postId, status } = data;
        const comments = commentsByPostId[postId];

        const comment = comments.find(comment => {
            return comment.id === id;
        });

        comment.status = status;

        await axios.post('http://event-bus-srv:4005/events', {
            type: 'CommentUpdated',
            data: {
                id,
                status,
                postId,
                content: comment.content
            }
        });
    }

    res.send({});
}
    
    );
