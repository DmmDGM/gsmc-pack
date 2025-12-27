// Defines modrinth api types
interface ModrinthAPIProject {
    additional_categories: string[];
    approved: string | null;
    body: string;
    body_url: string | null;
    categories: string[];
    client_side: string;
    color: number | null;
    description: string;
    discord_url: string | null;
    donation_urls: {
        id: string;
        platform: string;
        url: string;
    }[];
    downloads: number;
    followers: number;
    gallery: {
        created: string;
        description: string | null;
        featured: boolean;
        ordering: number;
        title: string | null;
        url: string;
    }[];
    game_versions: string[];
    icon_url: string | null;
    id: string;
    issues_url: string | null;
    license: {
        id: string;
        name: string;
        url: string | null;
    };
    loaders: string[];
    moderator_message: {
        body: string | null;
        message: string;
    };
    monetization_status: string;
    organization: null;
    project_type: string;
    published: string;
    queued: string | null;
    requested_status: string | null;
    server_side: string;
    slug: string;
    source_url: string | null;
    status: string;
    team: string;
    thread_id: string;
    title: string;
    updated: string;
    versions: string[];
    wiki_url: string | null;
} 
interface ModrinthAPIVersion {
    author_id: string;
    changelog: string | null;
    changelog_url: string | null;
    date_published: string;
    dependencies: {
        dependency_type: string;
        file_name: string | null;
        project_id: string | null;
        version_id: string | null;
    }[];
    downloads: number;
    featurd: boolean;
    files: {
        file_type: string | null;
        filename: string;
        hashes: {
            sha1: string;
            sha512: string;
        };
        id: string;
        primary: boolean;
        size: number;
        url: string;
    }[];
    game_versions: string[];
    id: string;
    loaders: string[];
    name: string;
    project_id: string;
    requested_status: string | null;
    status: string;
    version_number: string;
    version_type: string;
}

// Defines internal types
interface Pack {
    readonly origins: string[];
    readonly sources: Source[];
    readonly labels: Set<string>;
}
interface Source {
    // Defines source fields
    readonly origin: string;
    readonly label: string;
    
    // Defines source methods
    dep(pack: Pack): Promise<boolean>;
    sync(pack: Pack): Promise<boolean>;
    test(pack: Pack): Promise<boolean>;
}
