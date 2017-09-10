define([
	'lib/lodash'
	, 'text!template/projects.html'
	, 'crunch/utils'
	, 'Ractive'
	, 'lib/ractive/Ractive-transitions-fly'
	, 'lib/ractive/Ractive-transitions-slide' ], function(_, projectTemplate, Utils, Ractive, fly, slide) {
	

	var Projects = {
		ractive: null
		, create: function(Crunch) {

			if(Projects.ractive) {
				Projects.ractive.update();
				return;
			}
			
			var ractive = new Ractive({
				el: document.getElementById('projects')
				, template: projectTemplate
				, transitions: {
					fly: fly
					, slide: slide
				}
				, data: { 
					projects: Utils.cloneObject(Crunch.Session.state.projects)
					, getFolders: function(str) {
						var arr = str.split('/');
						if(arr && arr.length)
							arr.pop();
						else
							return "";

						return arr.reverse().map(function(v) { if(!v) return ""; return "<span>" + v + ' <i class="ico-chevron-right"></i></span>'; }).join("");
					}
					, _: _   // reference lodash
				}
			});
			ractive.on({
				select: function(event, obj) {
					obj.loading = true;
					Projects.ractive.update();
				}
			});

			Projects.ractive = ractive;
			

		}
		, update: function() {
			if(!this.ractive) {
				this.create(global.Crunch);
			}
			else {
				var projects = Utils.cloneObject(Crunch.Session.state.projects);
				this.ractive.set('projects', projects);
			}
		}
	};

	return Projects;
});