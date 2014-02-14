
# Usage

It's a little nodeJS CLI tool to :
- request a webpage
- inline and minify CSS and JS
- output the result webpage on the standard output

In the directory :

``node index http://some.random.url --minify  > output.html``

Or, to use it everywhere :

In the directory type `npm link`.

Now you can do ``cli-smoosh http://some.random.url --minify > result.txt``


##TODO

--strip, --strip_css & --strip_js options