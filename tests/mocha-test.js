assert = require('chai').assert

describe('Node-WebKit Mocha tests', function()
{
  nwObj      = null
  get_Window = null

  it('Get nw', function()
    {
       assert.equal(nwObj, null)
       nwObj = require('nw.gui')
       assert.notEqual(nwObj, null)
       assert.isOk(nwObj.App)
       assert.isOk(nwObj.Shell)
       assert.isOk(nwObj.Window)
    });

  it('Get window reference', function()
    {
       get_Window = currentWindow
       assert.notEqual(get_Window.window,null)
       assert.isOk(currentWindow.frameId)
       assert.isOk(currentWindow.cookies)
    })
  it('Check window title', function()
    {
       title_From_Dom        = currentWindow.window.document.title
       title_From_Get_Window = get_Window.title
       assert.equal(title_From_Dom,'Node-WebKit for mocha')
       assert.equal(title_From_Dom, title_From_Dom)
     })

});