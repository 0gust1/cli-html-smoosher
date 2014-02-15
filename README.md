
# Usage

It's a little nodeJS CLI tool to :
- request a webpage
- inline and minify CSS and JS
- output the result webpage on the standard output

You must have nodeJS installed on your system...

- checkout the repository
- In the directory type `npm install`.
- and type `npm link`.

Now you can do ``smoosh http://some.random.url --minify > result.txt``.
Type ``smoosh -h`` for help.

##TODO

warning : The code is quite rude actually ;)

- --strip, --strip_css & --strip_js options
- ability to process files
- testing