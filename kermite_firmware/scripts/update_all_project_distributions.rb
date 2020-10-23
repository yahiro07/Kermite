# frozen_string_literal: true

require 'fileutils'
require 'json'
require 'open3'
require 'digest/md5'

#------------------------------------------------------------

def pull_resource_store_repo
  puts 'pulling resource store repo ...'
  `git clone https://github.com/yahiro07/KermiteResourceStore.git KRS` unless File.exist?('KRS')
  Dir.chdir('KRS')
  dirty = !`git status`.include?('nothing to commit, working tree clean')
  if dirty
    `git checkout .`
    `git clean -df .`
  end
  `git pull`
  Dir.chdir('..')
  print "\e[A\e[K" unless dirty
  puts 'pulling resource store repo ... ok'
  puts
end

def copy_resources_to_local_resource_store_repo
  FileUtils.rm_rf('./KRS/resources')
  FileUtils.copy_entry('./dist', './KRS/resources')
end

#------------------------------------------------------------

def gather_target_project_names
  Dir.glob('./src/projects/**/rules.mk')
     .map { |path| File.dirname(path) }
     .select { |path| File.exist?(File.join(path, 'layout.json')) }
     .map { |path| path.sub('./src/projects/', '') }
end

def load_firmware_common_revisions
  version_file_path = './src/modules/versions.h'
  content = File.read(version_file_path)
  {
    storageFormatRevision: content.match(/^\#define CONFIG_STORAGE_FORMAT_REVISION (\d+)$/)[1],
    messageProtocolRevision: content.match(/^\#define RAWHID_MESSAGE_PROTOCOL_REVISION (\d+)$/)[1]
  }
end

def load_project_source_attributes(project_name)
  metadata_file_path = "./KRS/resources/variants/#{project_name}/metadata.json"

  obj = {}
  if File.exist?(metadata_file_path)
    text = File.read(metadata_file_path)
    obj = JSON.parse(text, { symbolize_names: true })
  end
  {
    releaseBuildRevision: obj[:releaseBuildRevision] || 0,
    hexFileMD5: obj[:hexFileMD5] || ''
  }
end

def make_project_build(project_name, build_revision)
  command = "make #{project_name}:build RELEASE_REVISION=#{build_revision}"
  _stdout, stderr, status = Open3.capture3(command)
  return { result: :ok } if status == 0

  { result: :ng, error_log: ">#{command}\n#{stderr}" }
end

def check_binary_size(project_name)
  size_command = "make #{project_name}:size"
  size_output_lines = `#{size_command}`
  usage_prog = size_output_lines.match(/^Program.*\(([\d.]+)% Full\)/)[1].to_f
  usage_data = size_output_lines.match(/^Data.*\(([\d.]+)% Full\)/)[1].to_f
  if usage_prog < 100.0 && usage_data < 100.0
    { result: :ok, flash: usage_prog, ram: usage_data }
  else
    { result: :ng, error_log: "firmware footprint overrun (FLASH: #{usage_prog}, RAM: #{usage_data})" }
  end
end

def read_output_hex_md5(project_name)
  core_name = File.basename(project_name)
  hex_file_path = "./build/#{project_name}/#{core_name}.hex"
  Digest::MD5.file(hex_file_path).to_s
end

def project_build_pipeline(project_name, source_attrs)
  build_revision = source_attrs[:releaseBuildRevision]
  hex_file_md5 = source_attrs[:hexFileMD5]

  `make #{project_name}:purge`

  build_res = make_project_build(project_name, build_revision)
  return build_res if build_res[:result] == :ng

  size_res = check_binary_size(project_name)
  return size_res if size_res[:result] == :ng

  new_hex_file_md5 = read_output_hex_md5(project_name)

  return { result: :ok, updated_attrs: {} } if new_hex_file_md5 == hex_file_md5

  build_revision += 1
  _touch_res = `touch ./src/modules/versions.h`
  make_project_build(project_name, build_revision)

  { result: :ok, updated_attrs: {
    releaseBuildRevision: build_revision,
    hexFileMD5: new_hex_file_md5,
    flashUsage: size_res[:flash],
    ramUsage: size_res[:ram]
  } }
end

def make_failure_metadata_content(source_attrs)
  {
    buildResult: 'failure',
    releaseBuildRevision: source_attrs[:releaseBuildRevision],
    buildTimestamp: Time.now.to_s
  }
end

def make_success_metadata_content(source_attrs, updated_attrs, common_revisions)
  sa = source_attrs
  ua = updated_attrs
  {
    buildResult: 'success',
    releaseBuildRevision: ua[:releaseBuildRevision] || sa[:releaseBuildRevision],
    buildTimestamp: Time.now.to_s,
    storageFormatRevision: common_revisions[:storageFormatRevision],
    messageProtocolRevision: common_revisions[:messageProtocolRevision],
    flashUsage: ua[:flashUsage] || sa[:flashUsage],
    ramUsage: ua[:ramUsage] || sa[:ramUsage],
    hexFileMD5: ua[:hexFileMD5] || sa[:hexFileMD5]
  }
end

def build_project_entry(project_name, common_revisions)
  puts "building #{project_name} ..."

  core_name = File.basename(project_name)
  src_dir = "./src/projects/#{project_name}"
  mid_dir = "./build/#{project_name}"
  dest_dir = "./dist/variants/#{project_name}"

  FileUtils.mkdir_p(dest_dir)

  source_attrs = load_project_source_attributes(project_name)

  build_res = project_build_pipeline(project_name, source_attrs)

  FileUtils.copy("#{src_dir}/layout.json", "#{dest_dir}/layout.json")
  FileUtils.copy_entry("#{src_dir}/profiles", "#{dest_dir}/profiles") if File.exist?("#{src_dir}/profiles")

  if build_res[:result] == :ng
    error_log = build_res[:error_log]
    puts(error_log)
    File.write("#{dest_dir}/build_error.log", error_log)
    metadata_obj = make_failure_metadata_content(source_attrs)
    File.write("#{dest_dir}/metadata.json", JSON.pretty_generate(metadata_obj))
    puts "build #{project_name} ... NG"
    puts
    false
  else
    FileUtils.copy("#{mid_dir}/#{core_name}.hex", "#{dest_dir}/#{core_name}.hex")
    updated_attrs = build_res[:updated_attrs]
    metadata_obj = make_success_metadata_content(source_attrs, updated_attrs, common_revisions)
    File.write("#{dest_dir}/metadata.json", JSON.pretty_generate(metadata_obj))
    print "\e[A\e[K"
    puts "build #{project_name} ... OK"
    true
  end
end

def build_projects
  `make clean`
  FileUtils.mkdir('./dist')
  project_names = gather_target_project_names
  puts "projects: #{project_names}"
  common_revisions = load_firmware_common_revisions
  results = project_names.map { |project_name| build_project_entry(project_name, common_revisions) }
  num_success = results.count(true)
  num_total = results.length
  puts "build stats: #{num_success}/#{num_total}"
  { success: num_success, total: num_total }
end

#------------------------------------------------------------

def read_os_version
  is_mac_os = RUBY_PLATFORM.include?('darwin')
  is_linux = RUBY_PLATFORM.include?('linux')
  is_windows = RUBY_PLATFORM.include?('windows')
  if is_mac_os
    "#{`sw_vers -productName`.strip} #{`sw_vers -productVersion`.strip}"
  elsif is_linux
    `lsb_release -d`.sub('Description:', '').strip
  elsif is_windows
    `ver`
  else
    ''
  end
end

def read_env_versions
  os_version = read_os_version
  avr_gcc_version = `avr-gcc -v 2>&1 >/dev/null | grep "gcc version"`.strip
  make_version = `make -v | grep "GNU Make"`.strip
  {
    OS: os_version,
    'avr-gcc': avr_gcc_version,
    make: make_version
  }
end

def make_current_summary(stats)
  file_paths = Dir.glob('./dist/variants/**/*').select { |f| File.file?(f) }
  files_md5_dict = file_paths.map do |file_path|
    rel_path = file_path.sub('./dist/', '')
    md5 = Digest::MD5.file(file_path).to_s
    [rel_path.intern, md5]
  end.to_h

  {
    info: {
      buildStats: stats,
      environment: read_env_versions,
      updatedAt: Time.now.to_s,
      filesRevision: 0
    },
    files: files_md5_dict
  }
end

def merge_summary(current, source)
  {
    info: {
      buildStats: current[:info][:buildStats],
      environment: current[:info][:environment],
      updatedAt: current[:info][:updatedAt],
      filesRevision: source[:info][:filesRevision] + 1
    },
    files: current[:files]
  }
end

def load_source_summary
  summary_file_path = './KRS/resources/summary.json'
  if File.exist?(summary_file_path)
    text = File.read(summary_file_path)
    return JSON.parse(text, { symbolize_names: true })
  end
  nil
end

def update_summary_if_files_changed(current_summary)
  source_summary = load_source_summary
  files_changed = (current_summary[:files] != source_summary[:files])

  puts "filesChanged: #{files_changed}"

  source_revision = source_summary[:info][:filesRevision]

  if files_changed
    puts "filesRevision: #{source_revision} --> #{source_revision + 1}"
  else
    puts "filesRevision: #{source_revision}"
  end

  saving_summary = files_changed ? merge_summary(current_summary, source_summary) : source_summary
  summary_json_text = JSON.pretty_generate(saving_summary)
  File.write('./dist/summary.json', summary_json_text)
end

#------------------------------------------------------------

def build_app_project_distributions
  pull_resource_store_repo
  stats = build_projects
  current_summary = make_current_summary(stats)
  update_summary_if_files_changed(current_summary)
  copy_resources_to_local_resource_store_repo
  puts 'done'
end

build_app_project_distributions if __FILE__ == $PROGRAM_NAME