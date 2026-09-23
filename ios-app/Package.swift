// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "KvNetflix",
    defaultLocalization: "vi",
    platforms: [
        .iOS(.v17)
    ],
    products: [
        .library(
            name: "KvNetflix",
            targets: ["KvNetflix"]
        )
    ],
    dependencies: [],
    targets: [
        .target(
            name: "KvNetflix",
            dependencies: [],
            path: "KvNetflix",
            resources: [
                .process("../Resources")
            ]
        )
    ]
)
