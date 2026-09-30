/**
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var path = require('path');
var childProcess = require('child_process');

// TypeScript files are compiled by tsc into out/tmp/tsc first. Traceur then picks up the compiled .js files from
// there, next to the plain .js files from src/ and test/, so both kinds of module end up in the same bundle.
var TS_OUT_DIR = 'out/tmp/tsc/';

module.exports = function(grunt) {
    // The compiled .js paths of the TypeScript files under a directory, e.g. 'ui/codePanel.js'.
    var compiledTypeScriptFiles = function(dir) {
        return grunt.file.expand({cwd: dir}, ['**/*.ts', '!**/*.d.ts']).map(function(e) {
            return e.replace(/\.ts$/, '.js');
        });
    };

    //noinspection JSUnresolvedFunction
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        traceur: {
            'translate-src': {
                options: {
                    experimental: true,
                    copyRuntime: 'out/tmp/traceur/bootstrap_pre_src',
                    moduleNaming: {
                        stripPrefix: 'out/tmp/traceur'
                    }
                },
                files: [{
                    expand: true,
                    cwd: 'src/',
                    src: ['**/*.js'],
                    dest: 'out/tmp/traceur/src/'
                }, {
                    expand: true,
                    cwd: TS_OUT_DIR + 'src/',
                    src: compiledTypeScriptFiles('src/'),
                    dest: 'out/tmp/traceur/src/'
                }]
            },
            'translate-test': {
                options: {
                    experimental: true,
                    moduleNaming: {
                        stripPrefix: 'out/tmp/traceur'
                    }
                },
                files: [{
                    expand: true,
                    cwd: 'test/',
                    src: ['**/*.js'],
                    dest: 'out/tmp/traceur/test/'
                }, {
                    expand: true,
                    cwd: TS_OUT_DIR + 'test/',
                    src: compiledTypeScriptFiles('test/'),
                    dest: 'out/tmp/traceur/test/'
                }]
            },
            'translate-test-perf': {
                options: {
                    experimental: true,
                    moduleNaming: {
                        stripPrefix: 'out/tmp/traceur'
                    }
                },
                files: [{
                    expand: true,
                    cwd: 'test_perf/',
                    src: ['**/*.js'],
                    dest: 'out/tmp/traceur/test_perf/'
                }]
            }
        },
        karma: {
            unit: {
                configFile: 'karma.test.conf.js'
            },
            'unit-chrome': {
                configFile: 'karma.test.conf.js',
                browsers: ['Chrome']
            },
            'unit-firefox': {
                configFile: 'karma.test.conf.js',
                browsers: ['Firefox']
            },
            'unit-travis': {
                configFile: 'karma.test.conf.js',
                browsers: ['Firefox']
            },
            'perf-chrome': {
                configFile: 'karma.test_perf.conf.js',
                browsers: ['Chrome']
            }
        },
        concat: {
            'concat-traceur-src': {
                options: {
                    separator: ';'
                },
                src: [
                    'out/tmp/traceur/bootstrap_pre_src/**/*.js',
                    'out/tmp/traceur/src/**/*.js',
                    'out/tmp/traceur/bootstrap_post_src/**/*.js'
                ],
                dest: 'out/tmp/concatenated-src.js'
            },
            'concat-traceur-test': {
                options: {
                    separator: ';'
                },
                src: [
                    'out/tmp/traceur/bootstrap_pre_src/**/*.js',
                    'out/tmp/traceur/bootstrap_pre_test/**/*.js',
                    'out/tmp/traceur/src/**/*.js',
                    'out/tmp/traceur/test/**/*.js',
                    'out/tmp/traceur/bootstrap_post_test/**/*.js'
                ],
                dest: 'out/test.js'
            },
            'concat-traceur-test-perf': {
                options: {
                    separator: ';'
                },
                src: [
                    'out/tmp/traceur/bootstrap_pre_src/**/*.js',
                    'out/tmp/traceur/bootstrap_pre_test/**/*.js',
                    'out/tmp/traceur/src/**/*.js',
                    'out/tmp/traceur/test_perf/**/*.js',
                    'out/tmp/traceur/bootstrap_post_test/**/*.js'
                ],
                dest: 'out/test_perf.js'
            }
        },
        uglify: {
            'uglify-concatenated-src': {
                options: {
                    maxLineLen: 128
                },
                files: {
                    'out/tmp/minified-src.js': ['out/tmp/concatenated-src.js']
                }
            }
        },
        include_file: {
            options: {
                src: ['html/qubitboard.template.html'],
                dest: 'out/tmp/'
            },
            your_target: {
                // Target-specific file lists and/or options go here.
            }
        },
        clean: {
            'clean-tmp': ['out/tmp'],
            'clean-out': ['out/']
        },
        makeTestPostBootstrap: {
            options: {
                from: null,
                to: null
            }
        }
    });

    grunt.registerTask('bootstrap-get-packages', function(src, dst) {
        // TypeScript modules are registered under their compiled .js name.
        var packagedFiles = grunt.file.expand(src.split(',')).map(function(e) {
            return e.replace(/\.ts$/, '.js');
        });
        var getters = packagedFiles.map(function(e) {
            return '$traceurRuntime.getModule("' + e + '");';
        }).join('\n');
        grunt.file.write(dst, getters);
    });

    grunt.registerTask('compile-ts', 'Type-check and compile the TypeScript sources with tsc.', function() {
        var tsc = path.join('node_modules', '.bin', process.platform === 'win32' ? 'tsc.cmd' : 'tsc');
        try {
            childProcess.execFileSync(tsc, ['-p', 'tsconfig.json', '--outDir', TS_OUT_DIR], {stdio: 'inherit'});
        } catch (ex) {
            grunt.fail.warn('TypeScript compilation failed.');
        }
    });

    grunt.registerTask('inject-js-into-html', function(htmlSrc, jsSrc, dst) {
        var html = grunt.file.read(htmlSrc);
        var js = grunt.file.read(jsSrc);
        var errPart = grunt.file.read('html/error.partial.html');
        var forgePart = grunt.file.read('html/forge.partial.html');
        var exportPart = grunt.file.read('html/export.partial.html');
        var menuPart = grunt.file.read('html/menu.partial.html');
        var codePart = grunt.file.read('html/code.partial.html');
        // Shown in the page header as major.minor, e.g. "2.4" for package.json version "2.4.0".
        var version = grunt.file.readJSON('package.json').version.split('.').slice(0, 2).join('.');
        var output = html;
        output = output.split("<!-- INCLUDE VERSION -->").join(version);
        output = output.split("<!-- INCLUDE SOURCE PART -->").join(js);
        output = output.split("<!-- INCLUDE MENU PART -->").join(menuPart);
        output = output.split("<!-- INCLUDE ERROR PART -->").join(errPart);
        output = output.split("<!-- INCLUDE FORGE PART -->").join(forgePart);
        output = output.split("<!-- INCLUDE EXPORT PART -->").join(exportPart);
        output = output.split("<!-- INCLUDE CODE PART -->").join(codePart);
        grunt.file.write(dst, output);
    });

    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-karma');
    grunt.loadNpmTasks('grunt-traceur');

    grunt.registerTask('build-src', [
        'clean:clean-tmp',
        'compile-ts',
        'traceur:translate-src',
        'bootstrap-get-packages:src/main.js:out/tmp/traceur/bootstrap_post_src/run_main.js',
        'concat:concat-traceur-src',
        'uglify:uglify-concatenated-src',
        'inject-js-into-html:html/qubitboard.template.html:out/tmp/minified-src.js:out/qubitboard.html',
        'clean:clean-tmp'
    ]);
    grunt.registerTask('build-debug', [
        'clean:clean-tmp',
        'compile-ts',
        'traceur:translate-src',
        'bootstrap-get-packages:src/main.js:out/tmp/traceur/bootstrap_post_src/run_main.js',
        'concat:concat-traceur-src',
        'inject-js-into-html:html/qubitboard.template.html:out/tmp/concatenated-src.js:out/qubitboard.html',
        'clean:clean-tmp'
    ]);
    grunt.registerTask('build-test', [
        'clean:clean-tmp',
        'compile-ts',
        'traceur:translate-src',
        'traceur:translate-test',
        'bootstrap-get-packages:test/**/*.test.js,test/**/*.test.ts:out/tmp/traceur/bootstrap_post_test/run_tests.js',
        'concat:concat-traceur-test',
        'clean:clean-tmp'
    ]);
    grunt.registerTask('build-test-perf', [
        'clean:clean-tmp',
        'compile-ts',
        'traceur:translate-src',
        'traceur:translate-test-perf',
        'bootstrap-get-packages:test_perf/**/*.perf.js:out/tmp/traceur/bootstrap_post_test/run_tests.js',
        'concat:concat-traceur-test-perf',
        'clean:clean-tmp'
    ]);
    grunt.registerTask('build-test-page', [
        'build-test',
        'inject-js-into-html:test_perf/test_page.template.html:out/test.js:out/test.html'
    ]);
    grunt.registerTask('build-test-perf-page', [
        'build-test-perf',
        'inject-js-into-html:test_perf/test_page.template.html:out/test_perf.js:out/test_perf.html'
    ]);

    grunt.registerTask('test-perf-chrome', ['build-test-perf', 'karma:perf-chrome']);
    grunt.registerTask('test-chrome', ['build-test', 'karma:unit-chrome']);
    grunt.registerTask('test-firefox', ['build-test', 'karma:unit-firefox']);
    grunt.registerTask('test-travis', ['build-test', 'karma:unit-travis']);
    grunt.registerTask('test', ['build-test', 'karma:unit']);
};
