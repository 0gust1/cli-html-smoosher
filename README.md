
It's a little nodeJS CLI tool to :
- request a webpage
- inline (+minify) or strip CSS and JS
- output the result webpage on the standard output

# Usage

- checkout the repository
- In the directory type `npm install`.
- and type `npm link`.

Now you can do ``smoosh http://some.random.url --minify > result.txt``.  

Type ``smoosh -h`` for help.

##TODO

- ability to process files
- testing