// --- server.js ---
const feathers = require('feathers');
const serveStatic = require('feathers').static;
const rest = require('feathers-rest');
const socketio = require('feathers-socketio');
const hooks = require('feathers-hooks');
const bodyParser = require('body-parser');
const handler = require('feathers-errors/handler');
const multer = require('multer');
const multipartMiddleware = multer();
const dauria = require('dauria');

// feathers-blob service
const blobService = require('feathers-blob');
// Here we initialize a FileSystem storage,
// but you can use feathers-blob with any other
// storage service like AWS or Google Drive.
const fs = require('fs-blob-store');
const blobStorage = fs(__dirname + '/uploads');


// Feathers app
const app = feathers();

// Serve our index page
app.use('/', serveStatic(__dirname))
// Parse HTTP JSON bodies
app.use(bodyParser.json({limit: '10mb'}));
// Parse URL-encoded params
app.use(bodyParser.urlencoded({limit: '10mb', extended: true }));
// Register hooks module
app.configure(hooks());
// Add REST API support
app.configure(rest());
// Configure Socket.io real-time APIs
app.configure(socketio());


// Upload Service with multipart support
app.use('/uploads',

    // multer parses the file named 'uri'.
    // Without extra params the data is
    // temporarely kept in memory
    multipartMiddleware.single('uri'),

    // another middleware, this time to
    // transfer the received file to feathers
    function(req,res,next){
        req.feathers.file = req.file;
        next();
    },
    blobService({Model: blobStorage})
);

// before-create Hook to get the file (if there is any)
// and turn it into a datauri,
// transparently getting feathers-blob
// to work with multipart file uploads
app.service('/uploads').before({
    create: [
        function(hook) {
            if (!hook.data.uri && hook.params.file){
                const file = hook.params.file;
                const uri = dauria.getBase64DataURI(file.buffer, file.mimetype);
                hook.data = {uri: uri};
            }
        }
    ]
});

// Register a nicer error handler than the default Express one
app.use(handler());

// Start the server
app.listen(3030, function(){
    console.log('Feathers app started at localhost:3030')
});
