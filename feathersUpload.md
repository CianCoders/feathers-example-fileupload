# File uploads in Feathersjs

Over the last months we at [ciancoders.com](https://ciancoders.com/) have been working in a new SPA project using Feathers and React, the combination of those two turns out to be **just amazing**.  

Recently we where struggling to find a way to upload files whitout having to write a separate Express middleware or having to (re)write a complex Feathers service.

# Our Goals
We want to implement an upload service in a way that it acomplishes these few important things:

1. It has to handle large files (+10MB).
2. Needs to work with the app's authetication and authorization.
3. The files has to be validated.
4. By the moment there is no third party storage service involved, but this will change in the near future.
5. Has to show the upload progress.
 
The plan is to upload the files to a feathers service, so we can take advantage of the hooks for authentication, authorization and validation, not to mention the service events.

Fortunately, there is an already developed file storage service: [feathers-blob](https://github.com/feathersjs/feathers-blob). With it we can easily archieve our goals, but (spoiler alert) it isn't the ideal solution, as it has some problems we will discuss below.


## Basic upload with feathers-blob and feathers-client

For the sake of simplicity, we will be working over a very basic feathers server, with just the upload service. 

Lets look at the server code:

```javascript
/* --- server.js --- */

const feathers = require('feathers');
const rest = require('feathers-rest');
const socketio = require('feathers-socketio');
const hooks = require('feathers-hooks');
const bodyParser = require('body-parser');
const handler = require('feathers-errors/handler');


// feathers-blob service
const blobService = require('feathers-blob');
// Here we initialize a FileSystem storage,
// but you can use feathers-blob with any other
// storage service like AWS or Google Drive.
const fs = require('fs-blob-store');
const blobStorage = fs(__dirname + '/uploads');


// Feathers app
const app = feathers();

// Parse HTTP JSON bodies
app.use(bodyParser.json());
// Parse URL-encoded params
app.use(bodyParser.urlencoded({ extended: true }));
// Register hooks module
app.configure(hooks());
// Add REST API support
app.configure(rest());
// Configure Socket.io real-time APIs
app.configure(socketio());


// Upload Service
app.use('/uploads', blobService({Model: blobStorage}));


// Register a nicer error handler than the default Express one
app.use(handler());

// Start the server
app.listen(3030, function(){
    console.log('Feathers app started at localhost:3030')
});
```

Now go ahead and POST something to localhost:3030/uploads`, for example with postman:

```json
{
    "uri": "data:image/gif;base64,R0lGODlhEwATAPcAAP/+//7/////+////fvzYvryYvvzZ/fxg/zxWfvxW/zwXPrtW/vxXvfrXv3xYvrvYvntYvnvY/ruZPrwZPfsZPjsZfjtZvfsZvHmY/zxavftaPrvavjuafzxbfnua/jta/ftbP3yb/zzcPvwb/zzcfvxcfzxc/3zdf3zdv70efvwd/rwd/vwefftd/3yfPvxfP70f/zzfvnwffvzf/rxf/rxgPjvgPjvgfnwhPvzhvjvhv71jfz0kPrykvz0mv72nvblTPnnUPjoUPrpUvnnUfnpUvXlUfnpU/npVPnqVPfnU/3uVvvsWPfpVvnqWfrrXPLiW/nrX/vtYv7xavrta/Hlcvnuf/Pphvbsif3zk/zzlPzylfjuk/z0o/LqnvbhSPbhSfjiS/jlS/jjTPfhTfjlTubUU+/iiPPokfrvl/Dll/ftovLWPfHXPvHZP/PbQ/bcRuDJP/PaRvjgSffdSe3ddu7fge7fi+zkuO7NMvPTOt2/Nu7SO+3OO/PWQdnGbOneqeneqvDqyu3JMuvJMu7KNfHNON7GZdnEbejanObXnOW8JOa9KOvCLOnBK9+4Ku3FL9ayKuzEMcenK9e+XODOiePSkODOkOW3ItisI9yxL+a9NtGiHr+VH5h5JsSfNM2bGN6rMJt4JMOYL5h4JZl5Jph3Jpl4J5h5J5h3KJl4KZp5Ks+sUN7Gi96lLL+PKMmbMZt2Jpp3Jpt3KZl4K7qFFdyiKdufKsedRdm7feOpQN2QKMKENrpvJbFfIrNjJL1mLMBpLr9oLrFhK69bJFkpE1kpFYNeTqFEIlsoFbmlnlsmFFwpGFkoF/////7+/v///wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACH5BAEAANAALAAAAAATABMAAAj/AKEJHCgokKJKlhThGciQYSIva7r8SHPFzqGGAwPd4bKlh5YsPKy0qFLnT0NAaHTcsIHDho0aKkaAwGCGEkM1NmSkIjWLBosVJT6cOjUrzsBKPl54KmYsACoTMmk1WwaA1CRoeM7siJEqmTIAsjp40ICK2bEApfZcsoQlxwxRzgI8W8XhgoVYA+Kq6sMK0QEYKVCUkoVqQwQJFTwFEAAAFZ9PlFy4OEEiRIYJD55EodDA1ClTbPp0okRFxBQDBRgskAKhiRMlc+Sw4SNpFCIoBBwkUMBkCBIiY8qAgcPG0KBHrBTFQbCEV5EjQYQACfNFjp5CgxpxagVtUhIjwzaJYSHzhQ4cP3ryQHLEqJbASnu+6EIW6o2b2X0ISXK0CFSugazs0YYmwQhziyuE2PLLIv3h0hArkRhiCCzAENOLL7tgAoqDGLXSSSaPMLIIJpmAUst/GA3UCiuv1PIKLtw1FBAAOw=="
}
```

The service will respond with something like this:

```json
{
  "id": "6454364d8facd7a88e627e4c4b11b032d2f83af8f7f9329ffc2b7a5c879dc838.gif",
  "uri": "the-same-uri-we-uploaded",
  "size": 1156
}
```

Or we can implement a very basic frontend with `feathers-client` and `jQuery`:

```html
<!doctype html>
<html>
    <head>
        <title>Feathersjs File Upload</title>
        <script   src="https://code.jquery.com/jquery-2.2.3.min.js"   integrity="sha256-a23g1Nt4dtEYOj7bR+vTu7+T8VP13humZFBJNIYoEJo="   crossorigin="anonymous"></script>
        <script type="text/javascript" src="//cdnjs.cloudflare.com/ajax/libs/core-js/2.1.4/core.min.js"></script>
        <script type="text/javascript" src="//unpkg.com/feathers-client@^1.0.0/dist/feathers.js"></script>
        <script type="text/javascript">
            // feathers client initialization
            const rest = feathers.rest('http://localhost:3030');
            const app = feathers()
            .configure(feathers.hooks())
            .configure(rest.jquery($));

            // setup jQuery to watch the ajax progress
            $.ajaxSetup({
                xhr: function () {
                    var xhr = new window.XMLHttpRequest();
                    // upload progress
                    xhr.addEventListener("progress", function (evt) {
                        if (evt.lengthComputable) {
                            var percentComplete = evt.loaded / evt.total;
                            console.log('upload progress: ', Math.round(percentComplete * 100) + "%");
                        }
                    }, false);
                    return xhr;
                }
            });

            const uploadService = app.service('uploads');
            const reader  = new FileReader();

            // upload on file selection
            $(document).ready(function(){
                $('input#file').change(function(){
                    var file = this.files[0];
                    reader.readAsDataURL(file); // encode file
                })
            });

            // when encoded, upload
            reader.addEventListener("load", function () {
                console.log('encoded file: ', reader.result);
                var upload = uploadService
                    .create({uri: reader.result})
                    .then(function(response){
                        alert('UPLOADED!! ');
                        console.log('Server responded with: ', response);
                    });
            }, false);
        </script>
    </head>
    <body>
        <h1>Let's upload some files!</h1>
        <input type="file" id="file"/>
    </body>
</html>

```

Simply as that, the file has been uploaded and saved to the `./uploads` directory. 

We'd just implemented all what we needed! Awesome! 

Let's call it a day shall we?... But hey, there is somethiing that doesn't feels quite right ...right?

### DataURI upload problems

It doesn't feels right because it is not. Let's imagine what would happen if we try to upload a large file, say 25MB or more: The entire file (plus some extra MB due to the encoding) has to be kept in memory for the entire upload proccess, this could look like nothing for a normal computer but for mobile devices it's a big deal. 

We have a big RAM consumption problem. Not to mention we have to encode the file before sending it... 

The solution is to split the dataURI and upload one small chunk at a time and then reasemble everything on the server. But hey, is not that the same thing  the browsers has been able to do since maybe the very early days of the web?  maybe in Netscape Navigator?

Well, actually doing a `multipart/form-data` post is still the easiest way to upload a file, plus there are various libraries out there wich can make it even easier.  


## Second and final attempt - feathers-blob with multipart support.

Back with the backend, in order to accept multipart uploads, we need a way to decode all the data received by the web server. Given that Feathers behaves like Express, let's just use `multer` to handle that.

``` javascript
/* --- server.js --- */
const multer = require('multer');
const multipartMiddleware = multer();

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


```

Notice we kept the file field name as *uri* just to keep it uniform, as the service will always work with that name anyways. But you can change it if you preffer.

As fheathers-blob only understands files encoded as dataURI, we need to convert them first, let's make a Hook for that:

```javascript
/* --- server.js --- */
const dauria = require('dauria');

// before-create Hook to get the file (if there is any)
// and turn it into a datauri,
// transparently getting feathers-blob to work 
// with multipart file uploads
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
```

*Et voila!*. Now we have a Feahtersjs file storage service working, with support for traditional multipart uploads, and a variety of storage options to choose. 

**Simply awesome.**


# Furhter improvements

The service always return the dataURI back to us, wich may not be neccesary as we'd just uploaded the file, also we need to validate the file and check for authorization. 

All those things can be easily done with more Hooks, and that's the benefit of keeping all inside feathersjs services. I left that to you.

For the frontend, there is a problem with the client: in order to show the upload progress it's stuck with only REST functionality and not real-time with socket.io. 

The solution is to switch `feathers-client` from REST to `socket.io`, and just use wherever you like for uploading the files, thats an easy task now that we are able to do a traditional `form-multipart` upload.

Here is an example using dropzone:

```html
<!doctype html>
<html>
    <head>
        <title>Feathersjs File Upload</title>

        <link rel="stylesheet" href="assets/dropzone.css">
        <script src="assets/dropzone.js"></script>

        <script type="text/javascript" src="socket.io/socket.io.js"></script>
        <script type="text/javascript" src="//cdnjs.cloudflare.com/ajax/libs/core-js/2.1.4/core.min.js"></script>
        <script type="text/javascript" src="//unpkg.com/feathers-client@^1.0.0/dist/feathers.js"></script>
        <script type="text/javascript">
            // feathers client initialization
            var socket = io('http://localhost:3030');
            const app = feathers()
            .configure(feathers.hooks())
            .configure(feathers.socketio(socket));
            const uploadService = app.service('uploads');

            // Now with Real-Time Support!
            uploadService.on('created', function(file){
                alert('Received file created event!', file);
            });


            // Let's use DropZone!
            Dropzone.options.myAwesomeDropzone = {
                paramName: "uri",
                uploadMultiple: false,
                init: function(){
                    this.on('uploadprogress', function(file, progress){
                        console.log('progresss', progress);
                    });
                }
            };
        </script>
    </head>
    <body>
        <h1>Let's upload some files!</h1>
        <form action="/uploads"
          class="dropzone"
          id="my-awesome-dropzone"></form>
    </body>
</html>
```
