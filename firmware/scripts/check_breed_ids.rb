require 'json'

AbortOnError = ARGV.include?('--abortOnError')

def get_all_project_paths
  Dir.glob('./src/projects/**/rules.mk')
     .map { |path| File.dirname(path) }
     .select do |path|
    ['layout.json', 'config.h'].all? { |file_name| File.exist?(File.join(path, file_name)) }
  end
     .map { |path| path.sub('./src/projects/', '') }
end

def check_breed_ids
  project_paths = get_all_project_paths
  project_infos = project_paths.map do |project_path|
    layout_file_path = "./src/projects/#{project_path}/layout.json"
    config_file_path = "./src/projects/#{project_path}/config.h"
    layout_content = JSON.parse(File.read(layout_file_path), { symbolize_names: true })
    breed_id = layout_content[:breedId]
    breed_name = layout_content[:breedName]

    config_content = File.read(config_file_path)
    config_breed_id = config_content.match(/^#define BREED_ID "([a-zA-Z0-9]+)"$/) ? Regexp.last_match(1) : nil

    unless breed_name
      puts "breedName is not defined in #{project_path}/layout.json"
      exit(1) if AbortOnError
    end

    unless breed_id
      puts "breedId is not defined in #{project_path}/layout.json"
      exit(1) if AbortOnError
    end

    unless config_breed_id
      puts "breedId is not defined in #{project_path}/config.h"
      exit(1) if AbortOnError
    end

    unless breed_id.match(/^[a-zA-Z0-9]{8}$/)
      puts "invalid breed id #{breed_id} for #{project_path}"
      exit(1) if AbortOnError
    end

    if breed_id != config_breed_id
      puts "inconsistent breed ids in #{project_path}/config.h and #{project_path}/layout.json"
      exit(1) if AbortOnError
    end

    {
      project_path: project_path,
      breed_id: breed_id,
      breed_name: breed_name
    }
  end

  all_breed_ids = project_infos.map { |info| info[:breed_id] }
  duprecated_breed_ids = all_breed_ids.select { |e| all_breed_ids.count(e) > 1 }.uniq

  if duprecated_breed_ids.length > 0
    bad_breed_id = duprecated_breed_ids[0]
    bad_project_paths = project_infos.filter { |info| info[:breed_id] == bad_breed_id }
                                     .map { |info| info[:project_path] }
    puts "breed id confliction. #{bad_breed_id} is used for #{bad_project_paths}"
    exit(1) if AbortOnError
  end
end

check_breed_ids if __FILE__ == $PROGRAM_NAME
