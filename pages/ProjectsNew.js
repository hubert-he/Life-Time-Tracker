/**
 * @jsx React.DOM
 */

var React = require('react');
var Q = require('q');
var Router = require('react-router');
var Link = Router.Link;
var RouteHandler = Router.RouteHandler;
var Moment = require('moment');
var _ = require('lodash');
var Mt = window.Mousetrap;
/*components*/
var remoteStorage = require('../components/storage.remote');
var DateRangePicker = require('../components/DateRangePicker');
var Pinyin = require('../components/Pinyin');


module.exports = React.createClass({
    mixins: [Router.State],

    getInitialState: function () {
        var startDate = new Moment().startOf('year').toDate(),
            endDate = new Moment().endOf('day').toDate();
        return _.extend({
            loading: true,
            startDate: startDate,
            endDate: endDate,
            projects: []
        }, this.getStateFromParams());
    },

    getStateFromParams: function () {
        var params = this.getParams();
        return {
            versionId: params.versionId,
            projectId: params.projectId
        };
    },

    render: function () {
        return (
            <section className="ltt_c-page ltt_c-page-projectsNew">
                <aside className="ltt_c-page-projectsNew-sidebar">
                    <DateRangePicker ref="dateRange" start={this.state.startDate} end={this.state.endDate}
                            onDateRangeChange={this.onDateRangeChange}/>
                    <FilterableProjects projects={this.state.projects}
                        projectId={this.state.projectId}
                        versionId={this.state.versionId}/>
                </aside>
                <main>
                    <RouteHandler {... _.pick(this.state, ['projectId', 'versionId'])}/>
                </main>
            </section>
        );
    },

    componentDidMount: function () {
        this.loadProjects();
    },

    componentWillReceiveProps: function () {
        this.setState(this.getStateFromParams());
    },

    componentWillUnmount: function () {
        Mt.unbind('command+f');
    },

    onDateRangeChange: function (start, end) {
        this.setState({
            startDate: start,
            endDate: end
        });
        this.loadProjects();
    },

    loadProjects: function () {
        var that = this;
        this.setState({ loading: true });
        remoteStorage.get('/api/projects', {
            start: this.state.startDate,
            end: this.state.endDate,
            aggregate: false
        }).then(function (results) {
                var projects = results.data;
                that.allProjects = projects;
                that.setState({
                    loading: false,
                    projects: projects
                });
            });
    }


});


var FilterableProjects = React.createClass({
    getDefaultProps: function () {
        return {
            projects: []
        };
    },

    getInitialState: function () {
        return {
            projects: this.props.projects
        };
    },

    componentWillReceiveProps: function (nextProps) {
        this.setState({
            projects: nextProps.projects
        });
    },

    componentDidMount: function () {
        var input = this.refs.nameInput;
        Mt.bind('command+f', function (e) {
            e.preventDefault();
            var $input = $(input.getDOMNode());
            $input.focus();
        });
    },

    render: function () {
        console.log('render filterProject');
        return (
            <div className="ltt_c-page-projectsNew-FilterableList">
                <input ref="nameInput" type="text" placeholder="name/classs/tag"
                        className="ltt_c-page-projectsNew-filter-name"
                        onChange={function(e) {
                            var text = e.target.value;
                            this.filterProject(text);
                        }.bind(this)}/>
                <div className="ltt_c-page-projectsNew-sidebar-projectTree">
                    {this.state.projects.map(this.renderProject)}
                </div>
            </div>
        );
    },

    renderProject: function (project) {
        var projectId = this.props.projectId;
        var isMatch = projectId === project._id;
        var className = isMatch ? 'active' : null;
        return <ProjectNav project={project} className={className}
            defaultIsOpen={isMatch} versionId={this.props.versionId}/>
    },


    filterProject: function (text) {
        var pinyin = new Pinyin();
        text = text.trim();
        var result = [];
        result = this.props.projects.filter(function (project) {
            var name = project.name;
            var py = pinyin.getCamelChars(name).toLowerCase();
            var fullPy = pinyin.getFullChars(name).toLowerCase();
            var tags = project.tags || [];
            var matchTag = tags.some(function (tag) {
                var tagPy = pinyin.getCamelChars(tag).toLowerCase();
                var tagFullPy = pinyin.getFullChars(tag).toLowerCase();
                return tag.indexOf(text) >= 0 || tagFullPy.indexOf(text) >= 0 || tagPy.indexOf(text) >= 0;
            });
            var matchClass = (project.classes || []).some(function (cls) {
                var upperCode = cls.code.toUpperCase();
                var upperText = text.toUpperCase();
                return upperCode.indexOf(upperText) >= 0;
            });
            return name.indexOf(text) >= 0 || fullPy.indexOf(text) >= 0 || py.indexOf(text) >= 0 || matchTag || matchClass;
        });
        this.setState({
            projects: result
        });
    }
})

var ProjectNav = React.createClass({
  getInitialState: function () {
    return { isOpen: this.props.defaultIsOpen};
  },

  getDefaultProps: function () {
    return { defaultIsOpen: false };
  },

  componentWillReceiveProps: function (newProps) {
    if (!this.state.isOpen)
      this.setState({ isOpen: newProps.defaultIsOpen });
  },

  toggle: function () {
    this.setState({ isOpen: !this.state.isOpen });
  },

  renderItems: function () {
    var project = this.props.project;
    var versionId = this.props.versionId;
    return this.state.isOpen ? (project.versions || []).map(function (version) {
        var params = {projectId: project._id, versionId: version._id};
        var className = "ltt_c-ProjectNav-Item";
        if (versionId === version._id) {
            className += ' active';
        }
      return (
        <li className={className} key={version._id}>
          <i className="fa fa-sitemap" title="version"></i>
          <Link to="projectVersionTask" params={params}>{version.name}</Link>
        </li>
      );
    }) : null;
  },

  render: function () {
    var project = this.props.project;
    var className ="ltt_c-ProjectNav";
    if (this.props.className) {
        className += ' ' + this.props.className;
    }
    var params = {projectId: project._id};
    var iconClassName = ('fa ' + (this.state.isOpen ? 'fa-folder-open-o' : 'fa-folder-o'));
    return (
      <div className={className}>
        <h3 onClick={this.toggle}>
            <i className={iconClassName}/>
            <Link to="projectTask" params={params}>{project.name}</Link>
        </h3>
        <ul>{this.renderItems()}</ul>
      </div>
    );
  }
});